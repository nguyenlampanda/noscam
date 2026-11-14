<?php

namespace App\Services\Social;

use App\Models\User;
use App\Models\WalletTopup;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SePaySettlementService
{
    public function __construct(
        private readonly WalletService $walletService,
        private readonly TopupPromotionService $promotions
    ) {}

    public function settle(int $webhookId): bool
    {
        return DB::transaction(function () use ($webhookId) {
            $webhook = DB::table('bank_webhook_transactions')
                ->where('id', $webhookId)
                ->lockForUpdate()
                ->first();

            if (!$webhook) {
                throw new RuntimeException(
                    'Không tìm thấy giao dịch SePay.'
                );
            }

            if ($webhook->status === 'processed') {
                return false;
            }

            if ($webhook->status !== 'matched'
                || !$webhook->wallet_topup_id) {
                throw new RuntimeException(
                    'Giao dịch chưa được đối soát hợp lệ.'
                );
            }

            $topup = WalletTopup::query()
                ->whereKey($webhook->wallet_topup_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($topup->status !== 'pending'
                || $topup->method !== 'bank_transfer') {
                throw new RuntimeException(
                    'Yêu cầu nạp không còn hợp lệ.'
                );
            }

            if (
                $webhook->provider !== 'sepay'
                || $webhook->transfer_type !== 'in'
                || (string) $webhook->bank_account !==
                    (string) config('sepay.bank_account')
                || !$this->sameVnd(
                    $webhook->amount,
                    $topup->amount
                )
            ) {
                throw new RuntimeException(
                    'Thông tin chuyển khoản không khớp.'
                );
            }

            // NOSCAM_SEPAY_SP_SETTLEMENT_V3
            if (str_starts_with((string) $topup->code, 'SP-')) {
                if ((string) $topup->code !== 'SP-'.$webhook->provider_transaction_id
                    || (string) $topup->bank_reference !== (string) $webhook->provider_transaction_id
                    || !$this->sameVnd($topup->amount, $webhook->amount)
                    || (float) $topup->amount < 10000) {
                    throw new RuntimeException('Mã SP hoặc số tiền không hợp lệ.');
                }

                $matchedUser = app(SePayTransferMatcher::class)
                    ->userFromContent((string) $webhook->transfer_content);
                if (!$matchedUser || (int) $matchedUser->id !== (int) $topup->user_id) {
                    throw new RuntimeException('Username không khớp yêu cầu nạp.');
                }
            } else {
            preg_match_all(
                '/(?<![A-Za-z0-9-])TP-[0-9]{14}-[A-Za-z0-9]{6}(?![A-Za-z0-9-])/',
                (string) $webhook->transfer_content,
                $matches
            );

            $codes = array_values(
                array_unique($matches[0])
            );

            if (
                count($codes) !== 1
                || $codes[0] !== $topup->code
            ) {
                throw new RuntimeException(
                    'Mã nạp tiền không khớp.'
                );
            }

            }

            $user = User::query()
                ->findOrFail($topup->user_id);

            $this->walletService->credit(
                user: $user,
                amount: (float) $topup->amount,
                type: 'deposit',
                referenceType: WalletTopup::class,
                referenceId: $topup->id,
                description: 'SePay nạp tiền '.$topup->code,
                meta: [
                    'source' => 'sepay',
                    'topup_code' => $topup->code,
                    'sepay_transaction_id' =>
                        $webhook->provider_transaction_id,
                ]
            );

            // NOSCAM_SEPAY_PROMOTION_V1
            // Lock promotions to serialize award-limit checks.
            $enabledPromotions = DB::table('topup_promotions')
                ->where('is_enabled', true)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($enabledPromotions->isNotEmpty()) {
                $best = $this->promotions->bestFor(
                    $user->id,
                    (float) $topup->amount
                );

                if ($best !== null
                    && $best['bonus_amount'] > 0) {
                    $bonus = $this->walletService->credit(
                        user: $user,
                        amount: $best['bonus_amount'],
                        type: 'adjustment',
                        referenceType: WalletTopup::class,
                        referenceId: $topup->id,
                        description:
                            'Thưởng nạp tiền '.$topup->code,
                        meta: [
                            'source' => 'sepay_promotion',
                            'topup_code' => $topup->code,
                            'promotion_id' =>
                                $best['promotion_id'],
                        ]
                    );

                    DB::table('topup_promotion_awards')
                        ->insert([
                            'topup_promotion_id' =>
                                $best['promotion_id'],
                            'wallet_topup_id' => $topup->id,
                            'user_id' => $user->id,
                            'topup_amount' => $topup->amount,
                            'bonus_percent' =>
                                $best['bonus_percent'],
                            'bonus_amount' =>
                                $best['bonus_amount'],
                            'wallet_transaction_id' =>
                                $bonus->id,
                            'awarded_at' => now(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                }
            }

            $topup->update([
                'status' => 'approved',
                'bank_reference' =>
                    $webhook->provider_transaction_id,
                'reviewed_at' => now(),
            ]);

            DB::table('bank_webhook_transactions')
                ->where('id', $webhookId)
                ->update([
                    'status' => 'processed',
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);

            return true;
        }, 3);
    }

    private function sameVnd(
        mixed $left,
        mixed $right
    ): bool {
        $normalize = static function (mixed $value): ?string {
            $value = (string) $value;

            if (!preg_match(
                '/^\d+(?:\.\d{1,4})?$/',
                $value
            )) {
                return null;
            }

            [$whole, $fraction] = array_pad(
                explode('.', $value, 2),
                2,
                ''
            );

            if (trim($fraction, '0') !== '') {
                return null;
            }

            $whole = ltrim($whole, '0');

            return $whole === '' ? '0' : $whole;
        };

        $a = $normalize($left);
        $b = $normalize($right);

        return $a !== null
            && $b !== null
            && $a === $b;
    }

}
