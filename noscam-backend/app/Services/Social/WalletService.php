<?php

namespace App\Services\Social;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class WalletService
{
    public function getOrCreate(User $user): Wallet
    {
        return Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'balance' => 0,
                'total_deposited' => 0,
                'total_spent' => 0,
                'total_refunded' => 0,
                'currency' => 'VND',
            ]
        );
    }

    public function credit(
        User $user,
        float $amount,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $description = null,
        ?int $createdBy = null,
        array $meta = []
    ): WalletTransaction {
        if ($amount <= 0) {
            throw new RuntimeException(
                'Số tiền cộng phải lớn hơn 0.'
            );
        }

        return DB::transaction(function () use (
            $user,
            $amount,
            $type,
            $referenceType,
            $referenceId,
            $description,
            $createdBy,
            $meta
        ) {
            $wallet = Wallet::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (!$wallet) {
                Wallet::create([
                    'user_id' => $user->id,
                    'balance' => 0,
                    'total_deposited' => 0,
                    'total_spent' => 0,
                    'total_refunded' => 0,
                    'currency' => 'VND',
                ]);

                $wallet = Wallet::query()
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            $before = (float) $wallet->balance;
            $after = $before + $amount;

            $wallet->balance = $after;

            if ($type === 'deposit') {
                $wallet->total_deposited =
                    (float) $wallet->total_deposited
                    + $amount;
            }

            if ($type === 'refund') {
                $wallet->total_refunded =
                    (float) $wallet->total_refunded
                    + $amount;
            }

            $wallet->save();

            return WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'code' => $this->transactionCode(),
                'type' => $type,
                'direction' => 'credit',
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'created_by' => $createdBy,
                'meta' => $meta ?: null,
            ]);
        }, 3);
    }

    public function debit(
        User $user,
        float $amount,
        string $type = 'order',
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $description = null,
        array $meta = []
    ): WalletTransaction {
        if ($amount <= 0) {
            throw new RuntimeException(
                'Số tiền trừ phải lớn hơn 0.'
            );
        }

        return DB::transaction(function () use (
            $user,
            $amount,
            $type,
            $referenceType,
            $referenceId,
            $description,
            $meta
        ) {
            $wallet = Wallet::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (!$wallet) {
                throw new RuntimeException(
                    'Ví chưa được khởi tạo.'
                );
            }

            $before = (float) $wallet->balance;

            if ($before < $amount) {
                throw new RuntimeException(
                    'Số dư không đủ.'
                );
            }

            $after = $before - $amount;

            $wallet->balance = $after;

            if ($type === 'order') {
                $wallet->total_spent =
                    (float) $wallet->total_spent
                    + $amount;
            }

            $wallet->save();

            return WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'code' => $this->transactionCode(),
                'type' => $type,
                'direction' => 'debit',
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'meta' => $meta ?: null,
            ]);
        }, 3);
    }

    private function transactionCode(): string
    {
        do {
            $code = 'WT-'
                .now()->format('YmdHis')
                .'-'
                .Str::upper(Str::random(6));
        } while (
            WalletTransaction::where(
                'code',
                $code
            )->exists()
        );

        return $code;
    }
}
