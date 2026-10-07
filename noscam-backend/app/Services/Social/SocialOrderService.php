<?php

namespace App\Services\Social;

use App\Models\SocialOrder;
use App\Models\SocialProviderService;
use App\Models\SocialService;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class SocialOrderService
{
    public function __construct(
        private WalletService $walletService
    ) {
    }

    public function create(
        User $user,
        SocialService $service,
        string $target,
        int $quantity,
        string $idempotencyKey
    ): SocialOrder {
        if (!$service->is_active) {
            throw new RuntimeException(
                'Dịch vụ hiện đang tạm ngưng.'
            );
        }

        if (
            $quantity < (int) $service->min_quantity ||
            $quantity > (int) $service->max_quantity
        ) {
            throw new RuntimeException(
                'Số lượng không nằm trong giới hạn dịch vụ.'
            );
        }

        $existing = SocialOrder::query()
            ->where(
                'idempotency_key',
                $idempotencyKey
            )
            ->first();

        if ($existing) {
            if (
                (int) $existing->user_id !==
                (int) $user->id
            ) {
                throw new RuntimeException(
                    'Idempotency key không hợp lệ.'
                );
            }

            return $existing;
        }

        $providerService =
            SocialProviderService::query()
                ->with('provider')
                ->where(
                    'social_service_id',
                    $service->id
                )
                ->where('is_active', true)
                ->whereHas(
                    'provider',
                    fn ($query) =>
                        $query->where(
                            'status',
                            'active'
                        )
                )
                ->orderBy('priority')
                ->orderBy('id')
                ->first();

        if (!$providerService) {
            throw new RuntimeException(
                'Dịch vụ chưa có nguồn API khả dụng.'
            );
        }

        $sellAmount = round(
            (
                (float) $service
                    ->sell_price_per_1000
            ) *
            $quantity /
            1000,
            4
        );

        $costAmount = round(
            $providerService->costPriceVnd()
            * $quantity /
            1000,
            4
        );

        return DB::transaction(
            function () use (
                $user,
                $service,
                $providerService,
                $target,
                $quantity,
                $idempotencyKey,
                $sellAmount,
                $costAmount
            ) {
                $existing =
                    SocialOrder::query()
                        ->where(
                            'idempotency_key',
                            $idempotencyKey
                        )
                        ->lockForUpdate()
                        ->first();

                if ($existing) {
                    return $existing;
                }

                $order = SocialOrder::create([
                    'code' =>
                        $this->orderCode(),

                    'user_id' =>
                        $user->id,

                    'social_service_id' =>
                        $service->id,

                    'social_provider_id' =>
                        $providerService
                            ->social_provider_id,

                    'social_provider_service_id' =>
                        $providerService->id,

                    'target' =>
                        trim($target),

                    'quantity' =>
                        $quantity,

                    'sell_amount' =>
                        $sellAmount,

                    'cost_amount' =>
                        $costAmount,

                    'profit_amount' =>
                        round(
                            $sellAmount -
                            $costAmount,
                            4
                        ),

                    'status' =>
                        'pending',

                    'remains' =>
                        $quantity,

                    'refunded_amount' =>
                        0,

                    'idempotency_key' =>
                        $idempotencyKey,

                    'attempts' =>
                        0,
                ]);

                $this->walletService->debit(
                    user: $user,
                    amount: $sellAmount,
                    type: 'order',
                    referenceType:
                        SocialOrder::class,
                    referenceId:
                        $order->id,
                    description:
                        'Thanh toán đơn '
                        .$order->code,
                    meta: [
                        'order_code' =>
                            $order->code,
                        'service_id' =>
                            $service->id,
                        'quantity' =>
                            $quantity,
                    ]
                );

                return $order
                    ->fresh()
                    ->load([
                        'service',
                        'provider',
                        'providerService',
                    ]);
            },
            3
        );
    }

    public function refund(
        SocialOrder $order,
        ?int $createdBy = null
    ): SocialOrder {
        if (!$order->user_id) {
            throw new RuntimeException(
                'Đơn hàng không có tài khoản để hoàn tiền.'
            );
        }

        return DB::transaction(
            function () use (
                $order,
                $createdBy
            ) {
                $locked = SocialOrder::query()
                    ->lockForUpdate()
                    ->findOrFail($order->id);

                $sellAmount =
                    (float) $locked->sell_amount;

                $alreadyRefunded =
                    (float) $locked->refunded_amount;

                $refund =
                    max(
                        0,
                        $sellAmount -
                        $alreadyRefunded
                    );

                if ($refund <= 0) {
                    return $locked;
                }

                $this->walletService->credit(
                    user:
                        $locked->user,
                    amount:
                        $refund,
                    type:
                        'refund',
                    referenceType:
                        SocialOrder::class,
                    referenceId:
                        $locked->id,
                    description:
                        'Hoàn tiền đơn '
                        .$locked->code,
                    createdBy:
                        $createdBy,
                    meta: [
                        'order_code' =>
                            $locked->code,
                    ]
                );

                $locked->refunded_amount =
                    $alreadyRefunded +
                    $refund;

                $locked->save();

                return $locked->fresh();
            },
            3
        );
    }

    private function orderCode(): string
    {
        do {
            $code = 'SO-'
                .now()->format('YmdHis')
                .'-'
                .Str::upper(
                    Str::random(6)
                );
        } while (
            SocialOrder::where(
                'code',
                $code
            )->exists()
        );

        return $code;
    }
}
