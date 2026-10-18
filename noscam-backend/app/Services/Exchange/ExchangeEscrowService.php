<?php

namespace App\Services\Exchange;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskClaim;
use App\Services\Social\WalletService;
use Illuminate\Support\Facades\DB;
use LogicException;
use RuntimeException;

class ExchangeEscrowService
{
    public function validateAmount(int $amount): int
    {
        if ($amount <= 0) {
            throw new LogicException(
                'Số xu phải là số nguyên lớn hơn 0.'
            );
        }

        return $amount;
    }

    public function holdCampaignBudget(
        ExchangeCampaign $campaign
    ): void {
        DB::transaction(function () use ($campaign) {
            $locked = ExchangeCampaign::query()
                ->whereKey($campaign->id)
                ->lockForUpdate()
                ->firstOrFail();

            $key = 'exchange:campaign:'
                . $locked->id
                . ':hold';

            $existing = ExchangeEscrowEntry::query()
                ->where('idempotency_key', $key)
                ->first();

            if ($existing) {
                if (
                    $existing->entry_type !== 'hold'
                    || (int) $existing->campaign_id !== (int) $locked->id
                    || (int) $existing->amount !== (int) $locked->budget_total
                    || !$existing->wallet_transaction_id
                    || $locked->status !== 'active'
                ) {
                    throw new RuntimeException(
                        'Dữ liệu ký quỹ không nhất quán.'
                    );
                }

                return;
            }

            if ($locked->status !== 'draft') {
                throw new RuntimeException(
                    'Chiến dịch không ở trạng thái draft.'
                );
            }

            if (!$locked->rules_accepted || !$locked->rules_accepted_at) {
                throw new RuntimeException(
                    'Chưa chấp nhận điều khoản chiến dịch.'
                );
            }

            $quantity = (int) $locked->quantity;
            $cost = $this->wholeAmount($locked->cost_per_task);
            $reward = $this->wholeAmount($locked->reward_per_task);
            $total = $this->wholeAmount($locked->budget_total);

            if (
                $quantity <= 0
                || $reward > $cost
                || $quantity * $cost !== $total
                || (float) $locked->budget_held != 0
                || (float) $locked->budget_settled != 0
                || (float) $locked->budget_refunded != 0
            ) {
                throw new RuntimeException(
                    'Ngân sách chiến dịch không hợp lệ.'
                );
            }

            $transaction = app(WalletService::class)->debit(
                $locked->user,
                (float) $total,
                'adjustment',
                'exchange_campaign',
                (int) $locked->id,
                'Giữ ngân sách Exchange #' . $locked->id,
                ['exchange_action' => 'hold']
            );

            ExchangeEscrowEntry::create([
                'campaign_id' => $locked->id,
                'claim_id' => null,
                'entry_type' => 'hold',
                'amount' => $total,
                'idempotency_key' => $key,
                'wallet_transaction_id' => $transaction->id,
                'meta' => [
                    'quantity' => $quantity,
                    'cost_per_task' => $cost,
                    'reward_per_task' => $reward,
                ],
            ]);

            $locked->budget_held = $total;
            $locked->status = 'active';
            $locked->save();
        }, 3);
    }

    private function wholeAmount(mixed $value): int
    {
        $text = (string) $value;

        if (!preg_match('/^[0-9]+(?:\.0{1,4})?$/', $text)) {
            throw new RuntimeException(
                'Exchange chỉ hỗ trợ số xu nguyên.'
            );
        }

        $integer = explode('.', $text, 2)[0];

        if (
            strlen($integer) > 15
            || (float) $integer > PHP_INT_MAX
        ) {
            throw new RuntimeException(
                'Số xu vượt giới hạn.'
            );
        }

        return $this->validateAmount((int) $integer);
    }

    public function settleClaim(
        ExchangeTaskClaim $claim
    ): void {
        DB::transaction(function () use ($claim) {
            // Khóa chiến dịch trước, thống nhất thứ tự khóa.
            $claimSnapshot = ExchangeTaskClaim::query()
                ->whereKey($claim->id)
                ->firstOrFail();

            $campaign = ExchangeCampaign::query()
                ->whereKey($claimSnapshot->campaign_id)
                ->lockForUpdate()
                ->firstOrFail();

            $locked = ExchangeTaskClaim::query()
                ->whereKey($claim->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $locked->campaign_id !== (int) $campaign->id) {
                throw new RuntimeException(
                    'Nhiệm vụ không thuộc chiến dịch.'
                );
            }

            $key = 'exchange:claim:' . $locked->id . ':settle';

            $existing = ExchangeEscrowEntry::query()
                ->where('idempotency_key', $key)
                ->first();

            if ($existing) {
                if (
                    $existing->entry_type !== 'reward'
                    || (int) $existing->claim_id !== (int) $locked->id
                    || (int) $existing->campaign_id !== (int) $campaign->id
                    || !$existing->wallet_transaction_id
                    || $locked->status !== 'settled'
                ) {
                    throw new RuntimeException(
                        'Dữ liệu thanh toán không nhất quán.'
                    );
                }

                return;
            }

            if (!in_array($campaign->status, ['active', 'paused', 'cancelling'], true)) {
                throw new RuntimeException(
                    'Chiến dịch không hoạt động.'
                );
            }

            if ($locked->status !== 'submitted') {
                throw new RuntimeException(
                    'Nhiệm vụ chưa đủ điều kiện thanh toán.'
                );
            }

            if ($locked->risk_hold) {
                throw new RuntimeException(
                    'Nhiệm vụ đang được giữ để kiểm tra rủi ro.'
                );
            }

            if (
                !$locked->submitted_at
                || !$locked->review_deadline_at
                || !$locked->submitted_username
                || !$locked->submitted_profile_url
                || (int) $locked->worker_user_id === (int) $campaign->user_id
            ) {
                throw new RuntimeException(
                    'Thông tin nhiệm vụ không hợp lệ.'
                );
            }

            $cost = $this->wholeAmount($campaign->cost_per_task);
            $reward = $this->wholeAmount($campaign->reward_per_task);
            $fee = $cost - $reward;

            if ($fee < 0) {
                throw new RuntimeException(
                    'Giá thưởng vượt quá giá nhiệm vụ.'
                );
            }

            $held = $this->wholeNonnegativeAmount(
                $campaign->budget_held
            );

            $settled = $this->wholeNonnegativeAmount(
                $campaign->budget_settled
            );

            $refunded = $this->wholeNonnegativeAmount(
                $campaign->budget_refunded
            );

            $total = $this->wholeAmount(
                $campaign->budget_total
            );

            if (
                $held < $cost
                || $held + $settled + $refunded !== $total
            ) {
                throw new RuntimeException(
                    'Ngân sách ký quỹ không nhất quán.'
                );
            }

            $transaction = app(WalletService::class)->credit(
                $locked->worker,
                (float) $reward,
                'adjustment',
                'exchange_task_claim',
                (int) $locked->id,
                'Thưởng nhiệm vụ Exchange #' . $locked->id,
                null,
                ['exchange_action' => 'reward']
            );

            ExchangeEscrowEntry::create([
                'campaign_id' => $campaign->id,
                'claim_id' => $locked->id,
                'entry_type' => 'reward',
                'amount' => $reward,
                'idempotency_key' => $key,
                'wallet_transaction_id' => $transaction->id,
                'meta' => [
                    'cost_per_task' => $cost,
                    'platform_fee' => $fee,
                ],
            ]);

            ExchangeEscrowEntry::create([
                'campaign_id' => $campaign->id,
                'claim_id' => $locked->id,
                'entry_type' => 'fee',
                'amount' => $fee,
                'idempotency_key' => 'exchange:claim:'
                    . $locked->id . ':fee',
                'wallet_transaction_id' => null,
            ]);

            $campaign->budget_held = $held - $cost;
            $campaign->budget_settled = $settled + $cost;
            $campaign->save();

            $locked->status = 'settled';
            $locked->settled_at = now();
            $locked->finalized_at = now();
            $locked->save();
        }, 3);
    }


    public function resolveDisputedClaim(
        ExchangeTaskClaim $claim,
        string $decision
    ): void {
        if (!in_array($decision, ['approve', 'refund'], true)) {
            throw new RuntimeException(
                'Quyết định phân xử không hợp lệ.'
            );
        }

        DB::transaction(function () use ($claim, $decision) {
            $snapshot = ExchangeTaskClaim::query()
                ->whereKey($claim->id)
                ->firstOrFail();

            $campaign = ExchangeCampaign::query()
                ->whereKey($snapshot->campaign_id)
                ->lockForUpdate()
                ->firstOrFail();

            $locked = ExchangeTaskClaim::query()
                ->whereKey($claim->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                (int) $locked->campaign_id !== (int) $campaign->id
                || !in_array($campaign->status, ['active', 'paused', 'cancelling'], true)
                || $locked->status !== 'disputed'
                || $locked->risk_hold
            ) {
                throw new RuntimeException(
                    'Nhiệm vụ không đủ điều kiện phân xử.'
                );
            }

            $dispute = $locked->dispute()
                ->lockForUpdate()
                ->first();

            if (
                !$dispute
                || $dispute->status !== 'pending'
                || $dispute->resolved_at !== null
                || $dispute->resolved_by !== null
                || (int) $dispute->opened_by
                    !== (int) $locked->worker_user_id
            ) {
                throw new RuntimeException(
                    'Hồ sơ tranh chấp không hợp lệ.'
                );
            }

            if (
                !$locked->submitted_at
                || !$locked->review_deadline_at
                || !$locked->rejected_at
                || !$locked->appeal_deadline_at
                || !$locked->submitted_username
                || !$locked->submitted_profile_url
                || (int) $locked->worker_user_id
                    === (int) $campaign->user_id
            ) {
                throw new RuntimeException(
                    'Thông tin nhiệm vụ không hợp lệ.'
                );
            }

            $cost = $this->wholeAmount(
                $campaign->cost_per_task
            );

            $reward = $this->wholeAmount(
                $campaign->reward_per_task
            );

            $held = $this->wholeNonnegativeAmount(
                $campaign->budget_held
            );

            $settled = $this->wholeNonnegativeAmount(
                $campaign->budget_settled
            );

            $refunded = $this->wholeNonnegativeAmount(
                $campaign->budget_refunded
            );

            $total = $this->wholeAmount(
                $campaign->budget_total
            );

            if (
                $reward > $cost
                || $held < $cost
                || $held + $settled + $refunded !== $total
            ) {
                throw new RuntimeException(
                    'Ngân sách ký quỹ không nhất quán.'
                );
            }

            $prefix = 'exchange:claim:' . $locked->id;

            if (
                ExchangeEscrowEntry::query()
                    ->whereIn('idempotency_key', [
                        $prefix . ':settle',
                        $prefix . ':refund',
                        $prefix . ':fee',
                    ])
                    ->exists()
            ) {
                throw new RuntimeException(
                    'Nhiệm vụ đã có giao dịch tài chính.'
                );
            }

            if ($decision === 'approve') {
                $fee = $cost - $reward;

                $transaction = app(WalletService::class)->credit(
                    $locked->worker,
                    (float) $reward,
                    'adjustment',
                    'exchange_task_claim',
                    (int) $locked->id,
                    'Thưởng tranh chấp Exchange #' . $locked->id,
                    null,
                    ['exchange_action' => 'dispute_reward']
                );

                ExchangeEscrowEntry::create([
                    'campaign_id' => $campaign->id,
                    'claim_id' => $locked->id,
                    'entry_type' => 'reward',
                    'amount' => $reward,
                    'idempotency_key' => $prefix . ':settle',
                    'wallet_transaction_id' => $transaction->id,
                    'meta' => [
                        'decision' => 'approve',
                        'platform_fee' => $fee,
                    ],
                ]);

                ExchangeEscrowEntry::create([
                    'campaign_id' => $campaign->id,
                    'claim_id' => $locked->id,
                    'entry_type' => 'fee',
                    'amount' => $fee,
                    'idempotency_key' => $prefix . ':fee',
                    'wallet_transaction_id' => null,
                ]);

                $campaign->budget_settled = $settled + $cost;
                $locked->status = 'settled';
                $locked->settled_at = now();
            } else {
                $transaction = app(WalletService::class)->credit(
                    $campaign->user,
                    (float) $cost,
                    'refund',
                    'exchange_task_claim',
                    (int) $locked->id,
                    'Hoàn xu tranh chấp Exchange #' . $locked->id,
                    null,
                    ['exchange_action' => 'dispute_refund']
                );

                ExchangeEscrowEntry::create([
                    'campaign_id' => $campaign->id,
                    'claim_id' => $locked->id,
                    'entry_type' => 'refund',
                    'amount' => $cost,
                    'idempotency_key' => $prefix . ':refund',
                    'wallet_transaction_id' => $transaction->id,
                    'meta' => ['decision' => 'refund'],
                ]);

                $campaign->budget_refunded = $refunded + $cost;
                $locked->status = 'refunded';
            }

            $campaign->budget_held = $held - $cost;
            $campaign->save();

            $locked->finalized_at = now();
            $locked->save();
        }, 3);
    }

    private function wholeNonnegativeAmount(mixed $value): int
    {
        if ((float) $value == 0 && preg_match(
            '/^0(?:\\.0{1,4})?$/',
            (string) $value
        )) {
            return 0;
        }

        return $this->wholeAmount($value);
    }

    public function refundClaim(
        ExchangeTaskClaim $claim
    ): void {
        DB::transaction(function () use ($claim) {
            $snapshot = ExchangeTaskClaim::query()
                ->whereKey($claim->id)
                ->firstOrFail();

            // Luôn khóa chiến dịch trước nhiệm vụ.
            $campaign = ExchangeCampaign::query()
                ->whereKey($snapshot->campaign_id)
                ->lockForUpdate()
                ->firstOrFail();

            $locked = ExchangeTaskClaim::query()
                ->whereKey($claim->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $locked->campaign_id !== (int) $campaign->id) {
                throw new RuntimeException(
                    'Nhiệm vụ không thuộc chiến dịch.'
                );
            }

            $key = 'exchange:claim:' . $locked->id . ':refund';

            $existing = ExchangeEscrowEntry::query()
                ->where('idempotency_key', $key)
                ->first();

            if ($existing) {
                if (
                    $existing->entry_type !== 'refund'
                    || (int) $existing->claim_id !== (int) $locked->id
                    || (int) $existing->campaign_id !== (int) $campaign->id
                    || !$existing->wallet_transaction_id
                    || $locked->status !== 'refunded'
                ) {
                    throw new RuntimeException(
                        'Dữ liệu hoàn xu không nhất quán.'
                    );
                }

                return;
            }

            if (!in_array($campaign->status, ['active', 'paused', 'cancelling'], true)) {
                throw new RuntimeException(
                    'Chiến dịch không hoạt động.'
                );
            }

            if ($locked->status !== 'rejected') {
                throw new RuntimeException(
                    'Nhiệm vụ chưa đủ điều kiện hoàn xu.'
                );
            }

            if ($locked->risk_hold) {
                throw new RuntimeException(
                    'Nhiệm vụ đang bị giữ để kiểm tra rủi ro.'
                );
            }

            if (
                !$locked->rejected_at
                || !$locked->appeal_deadline_at
                || $locked->appeal_deadline_at->isFuture()
                || $locked->appeal_deadline_at->lt(
                    $locked->rejected_at->copy()->addHours(48)
                )
            ) {
                throw new RuntimeException(
                    'Chưa hết thời hạn khiếu nại hợp lệ.'
                );
            }

            // Có tranh chấp thì không tự động hoàn xu.
            if ($locked->dispute()->exists()) {
                throw new RuntimeException(
                    'Nhiệm vụ có tranh chấp, cần admin xử lý.'
                );
            }

            $cost = $this->wholeAmount(
                $campaign->cost_per_task
            );

            $held = $this->wholeNonnegativeAmount(
                $campaign->budget_held
            );

            $settled = $this->wholeNonnegativeAmount(
                $campaign->budget_settled
            );

            $refunded = $this->wholeNonnegativeAmount(
                $campaign->budget_refunded
            );

            $total = $this->wholeAmount(
                $campaign->budget_total
            );

            if (
                $held < $cost
                || $held + $settled + $refunded !== $total
            ) {
                throw new RuntimeException(
                    'Ngân sách ký quỹ không nhất quán.'
                );
            }

            // Chỉ hoàn lại xu đã ký quỹ, không tạo xu mới.
            $transaction = app(WalletService::class)->credit(
                $campaign->user,
                (float) $cost,
                'refund',
                'exchange_task_claim',
                (int) $locked->id,
                'Hoàn xu nhiệm vụ Exchange #' . $locked->id,
                null,
                ['exchange_action' => 'refund']
            );

            ExchangeEscrowEntry::create([
                'campaign_id' => $campaign->id,
                'claim_id' => $locked->id,
                'entry_type' => 'refund',
                'amount' => $cost,
                'idempotency_key' => $key,
                'wallet_transaction_id' => $transaction->id,
                'meta' => [
                    'reason' => 'final_rejection',
                ],
            ]);

            $campaign->budget_held = $held - $cost;
            $campaign->budget_refunded = $refunded + $cost;
            $campaign->save();

            $locked->status = 'refunded';
            $locked->finalized_at = now();
            $locked->save();
        }, 3);
    }
}
