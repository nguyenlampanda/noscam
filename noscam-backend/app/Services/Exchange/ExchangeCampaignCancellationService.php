<?php

namespace App\Services\Exchange;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskClaim;
use App\Services\Social\WalletService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ExchangeCampaignCancellationService
{
    private function amount(mixed $value): int
    {
        $text = (string) $value;

        if (!preg_match('/^(0|[1-9][0-9]*)(?:\.0{1,4})?$/', $text)) {
            throw new RuntimeException('Số xu không hợp lệ.');
        }

        $integer = explode('.', $text, 2)[0];

        if (
            strlen($integer) > 14
            || (float) $integer > PHP_INT_MAX
        ) {
            throw new RuntimeException('Số xu vượt giới hạn.');
        }

        return (int) $integer;
    }

    public function finalize(
        int $campaignId,
        int $adminId,
        string $reason
    ): array {
        return DB::transaction(function () use (
            $campaignId,
            $adminId,
            $reason
        ) {
            // Thứ tự khóa: campaign -> wallet.
            $campaign = ExchangeCampaign::query()
                ->whereKey($campaignId)
                ->lockForUpdate()
                ->firstOrFail();

            $key = 'exchange:campaign:'
                . $campaign->id
                . ':cancel:refund';

            $existing = ExchangeEscrowEntry::query()
                ->where('idempotency_key', $key)
                ->first();

            if ($campaign->status === 'cancelled') {
                $total = $this->amount($campaign->budget_total);
                $held = $this->amount($campaign->budget_held);
                $settled = $this->amount($campaign->budget_settled);
                $refunded = $this->amount($campaign->budget_refunded);
                $cost = $this->amount($campaign->cost_per_task);
                $quantity = (int) $campaign->quantity;

                if (
                    $held !== 0
                    || $cost <= 0
                    || $quantity <= 0
                    || $quantity > intdiv(PHP_INT_MAX, $cost)
                    || $quantity * $cost !== $total
                    || $settled + $refunded !== $total
                ) {
                    throw new RuntimeException(
                        'Ngân sách chiến dịch đã hủy không nhất quán.'
                    );
                }

                $claimRefunded = ExchangeTaskClaim::query()
                    ->where('campaign_id', $campaign->id)
                    ->where('status', 'refunded')
                    ->count();

                $claimSettled = ExchangeTaskClaim::query()
                    ->where('campaign_id', $campaign->id)
                    ->where('status', 'settled')
                    ->count();

                $otherClaims = ExchangeTaskClaim::query()
                    ->where('campaign_id', $campaign->id)
                    ->whereNotIn('status', ['settled', 'refunded'])
                    ->exists();

                if (
                    $otherClaims
                    || $claimSettled + $claimRefunded > $quantity
                    || $settled !== $claimSettled * $cost
                ) {
                    throw new RuntimeException(
                        'Claim của chiến dịch đã hủy không nhất quán.'
                    );
                }

                $claimRefundEntries = ExchangeEscrowEntry::query()
                    ->where('campaign_id', $campaign->id)
                    ->where('entry_type', 'refund')
                    ->whereNotNull('claim_id')
                    ->get();

                $claimRefundSum = 0;

                foreach ($claimRefundEntries as $entry) {
                    $claimRefundSum += $this->amount($entry->amount);
                }

                if (
                    $claimRefundEntries->count() !== $claimRefunded
                    || $claimRefundSum > $refunded
                ) {
                    throw new RuntimeException(
                        'Ledger hoàn claim không nhất quán.'
                    );
                }

                $expectedCancellationRefund = $refunded - $claimRefundSum;

                $cancellationEntries = ExchangeEscrowEntry::query()
                    ->where('campaign_id', $campaign->id)
                    ->where('entry_type', 'refund')
                    ->whereNull('claim_id')
                    ->get();

                if (
                    $cancellationEntries->count()
                        !== ($expectedCancellationRefund > 0 ? 1 : 0)
                    || (
                        $expectedCancellationRefund > 0
                        && (
                            !$existing
                            || $cancellationEntries->first()->id !== $existing->id
                        )
                    )
                    || (
                        $expectedCancellationRefund === 0
                        && $existing
                    )
                ) {
                    throw new RuntimeException(
                        'Ledger hủy chiến dịch không nhất quán.'
                    );
                }

                if ($expectedCancellationRefund > 0) {
                    $entry = $cancellationEntries->first();

                    $tx = $entry->wallet_transaction_id
                        ? DB::table('wallet_transactions')
                            ->where('id', $entry->wallet_transaction_id)
                            ->first()
                        : null;

                    $wallet = $tx
                        ? DB::table('wallets')
                            ->where('id', $tx->wallet_id)
                            ->first()
                        : null;

                    if (
                        $entry->idempotency_key !== $key
                        || $entry->entry_type !== 'refund'
                        || $entry->claim_id !== null
                        || (int) $entry->campaign_id !== (int) $campaign->id
                        || $this->amount($entry->amount)
                            !== $expectedCancellationRefund
                        || !$tx
                        || !$wallet
                        || (int) $tx->user_id !== (int) $campaign->user_id
                        || (int) $wallet->user_id !== (int) $campaign->user_id
                        || $tx->type !== 'refund'
                        || $tx->direction !== 'credit'
                        || $tx->reference_type !== 'exchange_campaign'
                        || (int) $tx->reference_id !== (int) $campaign->id
                        || $this->amount($tx->amount)
                            !== $expectedCancellationRefund
                        || round(
                            (float) $tx->balance_after
                            - (float) $tx->balance_before,
                            4
                        ) !== (float) $expectedCancellationRefund
                    ) {
                        throw new RuntimeException(
                            'Giao dịch hoàn hủy và Escrow không khớp.'
                        );
                    }
                }

                return [
                    'campaign_id' => $campaign->id,
                    'status' => 'cancelled',
                    'already_cancelled' => true,
                    'refunded_now' => 0,
                ];
            }

            if ($campaign->status !== 'cancelling') {
                throw new RuntimeException(
                    'Chiến dịch phải ở trạng thái cancelling.'
                );
            }

            if ($existing) {
                throw new RuntimeException(
                    'Đã có giao dịch hoàn hủy nhưng chiến dịch chưa cancelled.'
                );
            }

            $statuses = ExchangeTaskClaim::query()
                ->where('campaign_id', $campaign->id)
                ->select('status')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status')
                ->toArray();

            foreach ($statuses as $status => $count) {
                if (!in_array($status, ['settled', 'refunded'], true)) {
                    throw new RuntimeException(
                        'Còn claim chưa quyết toán: ' . $status
                    );
                }
            }

            $cost = $this->amount($campaign->cost_per_task);
            $total = $this->amount($campaign->budget_total);
            $held = $this->amount($campaign->budget_held);
            $settled = $this->amount($campaign->budget_settled);
            $refunded = $this->amount($campaign->budget_refunded);
            $quantity = (int) $campaign->quantity;

            if (
                $cost <= 0
                || $quantity <= 0
                || $quantity > intdiv(PHP_INT_MAX, $cost)
                || $quantity * $cost !== $total
                || $held + $settled + $refunded !== $total
            ) {
                throw new RuntimeException(
                    'Ngân sách chiến dịch không nhất quán.'
                );
            }

            $settledCount = (int) ($statuses['settled'] ?? 0);
            $refundedCount = (int) ($statuses['refunded'] ?? 0);

            if (
                $settledCount + $refundedCount > $quantity
                || $settled !== $settledCount * $cost
                || $refunded < $refundedCount * $cost
            ) {
                throw new RuntimeException(
                    'Claim và ngân sách không khớp.'
                );
            }

            // Không hoàn nếu dữ liệu ledger không đủ chứng cứ.
            $entries = ExchangeEscrowEntry::query()
                ->where('campaign_id', $campaign->id)
                ->get();

            $holds = $entries->where('entry_type', 'hold');
            $rewards = $entries->where('entry_type', 'reward');
            $fees = $entries->where('entry_type', 'fee');
            $refunds = $entries->where('entry_type', 'refund');

            if (
                $holds->count() !== 1
                || $this->amount($holds->first()->amount) !== $total
                || !$holds->first()->wallet_transaction_id
                || $rewards->count() !== $settledCount
                || $fees->count() !== $settledCount
                || $refunds->whereNotNull('claim_id')->count() !== $refundedCount
                || $refunds->whereNull('claim_id')->count() !== 0
            ) {
                throw new RuntimeException(
                    'Ledger Escrow không khớp claim.'
                );
            }

            $allowedTypes = ['hold', 'reward', 'fee', 'refund'];

            foreach ($entries as $entry) {
                if (!in_array($entry->entry_type, $allowedTypes, true)) {
                    throw new RuntimeException(
                        'Ledger có loại giao dịch chưa hỗ trợ.'
                    );
                }
            }

            $rewardSum = 0;
            $feeSum = 0;
            $refundSum = 0;

            foreach ($rewards as $entry) {
                if (!$entry->wallet_transaction_id || !$entry->claim_id) {
                    throw new RuntimeException('Reward ledger không hợp lệ.');
                }
                $rewardSum += $this->amount($entry->amount);
            }

            foreach ($fees as $entry) {
                if ($entry->wallet_transaction_id || !$entry->claim_id) {
                    throw new RuntimeException('Fee ledger không hợp lệ.');
                }
                $feeSum += $this->amount($entry->amount);
            }

            foreach ($refunds as $entry) {
                if (!$entry->wallet_transaction_id || !$entry->claim_id) {
                    throw new RuntimeException('Refund ledger không hợp lệ.');
                }
                $refundSum += $this->amount($entry->amount);
            }

            if (
                $rewardSum + $feeSum !== $settled
                || $refundSum !== $refunded
            ) {
                throw new RuntimeException(
                    'Tổng tiền ledger không khớp ngân sách.'
                );
            }

            // Đối chiếu các giao dịch đã phát sinh.
            $usedWalletTransactionIds = [];

            foreach ($entries as $entry) {
                if (!$entry->wallet_transaction_id) {
                    continue;
                }

                $tx = DB::table('wallet_transactions')
                    ->where('id', $entry->wallet_transaction_id)
                    ->first();

                $claim = $entry->claim_id
                    ? ExchangeTaskClaim::query()
                        ->whereKey($entry->claim_id)
                        ->where('campaign_id', $campaign->id)
                        ->first()
                    : null;

                $expectedUserId = $entry->entry_type === 'reward'
                    ? ($claim?->worker_user_id)
                    : $campaign->user_id;

                $expectedReferenceType = $entry->entry_type === 'hold'
                    ? 'exchange_campaign'
                    : 'exchange_task_claim';

                $expectedReferenceId = $entry->entry_type === 'hold'
                    ? $campaign->id
                    : $entry->claim_id;

                $expectedType = $entry->entry_type === 'refund'
                    ? 'refund'
                    : 'adjustment';

                $transactionId = (int) $entry->wallet_transaction_id;

                $wallet = $tx
                    ? DB::table('wallets')
                        ->where('id', $tx->wallet_id)
                        ->first()
                    : null;

                if (
                    !$tx
                    || !$wallet
                    || !$expectedUserId
                    || (
                        $entry->entry_type !== 'hold'
                        && !$claim
                    )
                    || isset($usedWalletTransactionIds[$transactionId])
                    || (int) $tx->user_id !== (int) $expectedUserId
                    || (int) $wallet->user_id !== (int) $expectedUserId
                    || $tx->type !== $expectedType
                    || $tx->reference_type !== $expectedReferenceType
                    || (int) $tx->reference_id !== (int) $expectedReferenceId
                    || $this->amount($tx->amount)
                        !== $this->amount($entry->amount)
                    || (
                        $entry->entry_type === 'hold'
                            ? $tx->direction !== 'debit'
                            : $tx->direction !== 'credit'
                    )
                    || (
                        $entry->entry_type === 'hold'
                            ? round((float) $tx->balance_before
                                - (float) $tx->balance_after, 4)
                            : round((float) $tx->balance_after
                                - (float) $tx->balance_before, 4)
                    ) !== (float) $this->amount($entry->amount)
                ) {
                    throw new RuntimeException(
                        'Giao dịch ví và Escrow không khớp.'
                    );
                }

                $usedWalletTransactionIds[$transactionId] = true;
            }

            if ($held > 0) {
                $owner = $campaign->user;

                if (!$owner) {
                    throw new RuntimeException(
                        'Không tìm thấy chủ chiến dịch.'
                    );
                }

                $transaction = app(WalletService::class)->credit(
                    $owner,
                    (float) $held,
                    'refund',
                    'exchange_campaign',
                    (int) $campaign->id,
                    'Hoàn ngân sách hủy Exchange #' . $campaign->id,
                    $adminId,
                    [
                        'exchange_action' => 'campaign_cancellation',
                        'reason' => $reason,
                    ]
                );

                ExchangeEscrowEntry::create([
                    'campaign_id' => $campaign->id,
                    'claim_id' => null,
                    'entry_type' => 'refund',
                    'amount' => $held,
                    'idempotency_key' => $key,
                    'wallet_transaction_id' => $transaction->id,
                    'meta' => [
                        'reason' => $reason,
                        'admin_id' => $adminId,
                    ],
                ]);
            }

            $campaign->budget_held = 0;
            $campaign->budget_refunded = $refunded + $held;
            $campaign->status = 'cancelled';
            $campaign->save();

            DB::afterCommit(function () use (
                $campaignId,
                $adminId,
                $held
            ) {
                Log::info('exchange.campaign.cancelled', [
                    'campaign_id' => $campaignId,
                    'admin_id' => $adminId,
                    'refunded_amount' => $held,
                ]);
            });

            return [
                'campaign_id' => $campaign->id,
                'status' => 'cancelled',
                'already_cancelled' => false,
                'refunded_now' => $held,
            ];
        }, 3);
    }
}
