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
        string $idempotencyKey,
        array $options = []
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

        /*
         * Normalize options before idempotency comparison.
         * Reject invalid combinations before wallet debit.
         */
        $platform = strtolower(trim((string) $service->platform));
        $category = strtolower(trim((string) $service->category));

        if ($platform === 'facebook' && $category === 'comment') {
            if (
                !isset($options['comments'])
                || array_key_exists('reaction', $options)
                || array_diff(array_keys($options), ['comments'])
            ) {
                throw new RuntimeException(
                    'Vui lòng nhập nội dung bình luận hợp lệ.'
                );
            }

            $comments = str_replace(
                ["\r\n", "\r"],
                "\n",
                (string) $options['comments']
            );

            $lines = explode("\n", trim($comments));

            if (
                count($lines) !== $quantity
                || count(array_filter(
                    $lines,
                    fn ($line) => trim($line) !== ''
                )) !== $quantity
            ) {
                throw new RuntimeException(
                    'Số dòng bình luận phải bằng số lượng đặt.'
                );
            }

            $options = [
                'comments' => implode(
                    "\n",
                    array_map('trim', $lines)
                ),
            ];
        } elseif (
            $platform === 'facebook'
            && $category === 'reaction'
        ) {
            if (
                array_key_exists('comments', $options)
                || array_diff(array_keys($options), ['reaction'])
            ) {
                throw new RuntimeException(
                    'Tùy chọn Reaction không hợp lệ.'
                );
            }

            $reaction = strtoupper(
                trim((string) ($options['reaction'] ?? 'LIKE'))
            );

            if (!in_array($reaction, [
                'LIKE', 'LOVE', 'CARE', 'HAHA',
                'WOW', 'SAD', 'ANGRY'
            ], true)) {
                throw new RuntimeException(
                    'Cảm xúc Facebook không hợp lệ.'
                );
            }

            $options = ['reaction' => $reaction];
        } elseif ($options !== []) {
            throw new RuntimeException(
                'Dịch vụ này không hỗ trợ Comment/Reaction.'
            );
        }

        // Temporary safety gate until VietnamFB URL support is verified.
        if (
            $platform === 'facebook'
            && in_array($category, ['comment', 'reaction'], true)
        ) {
            throw new RuntimeException(
                'Dịch vụ đang được kiểm tra kết nối API. Vui lòng thử lại sau.'
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

            if (
                (int) $existing->social_service_id !== (int) $service->id
                || trim((string) $existing->target) !== trim($target)
                || (int) $existing->quantity !== $quantity
                || (array) ($existing->order_options ?? []) !== $options
            ) {
                throw new RuntimeException(
                    'Khóa đặt đơn đã được sử dụng cho nội dung khác.'
                );
            }

            return $existing;
        }

        /*
         * Admin chưa thiết lập giá:
         * không tạo đơn, không trừ ví.
         * Khách chỉ nhận thông báo chung.
         */
        if (
            $service->sell_price_per_1000 === null ||
            (float) $service->sell_price_per_1000 <= 0
        ) {
            throw new RuntimeException(
                'Liên hệ Admin'
            );
        }

        $providerService =
            SocialProviderService::query()
                ->with('provider')
                ->where(
                    'social_service_id',
                    $service->id
                )
                ->where('is_active', true)
                ->where('provider_availability', 'available')
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

        /*
         * Check the actual provider before charging.
         */
        if (
            $platform === 'facebook'
            && in_array($category, ['comment', 'reaction'], true)
        ) {
            $driver = strtolower(
                (string) ($providerService->provider?->driver ?? '')
            );

            $providerCode = strtoupper(
                (string) $providerService->provider_service_id
            );

            $group = explode(':', $providerCode, 2)[0];

            $expectedGroup = $category === 'comment'
                ? 'BUFF_COMMENT'
                : 'BUFF_LIKE';

            if (
                $driver !== 'vietnamfb'
                || $group !== $expectedGroup
            ) {
                throw new RuntimeException(
                    'Dịch vụ chưa được cấu hình đúng API VietnamFB.'
                );
            }
        }

        /*
         * Kiểm tra lại giá vốn tại thời điểm đặt.
         * Không cho tạo đơn bán hòa vốn hoặc bán lỗ.
         * Không tự chuyển sang Provider khác.
         */
        /*
         * Validate actual provider limits before charging wallet.
         * VietnamFB legacy channels may not publish numeric limits.
         * Never treat their fallback 1/1000000 as verified.
         */
        $providerData = $providerService->provider_data ?? [];
        $providerData = is_array($providerData) ? $providerData : [];
        $rawChannel = $providerData['provider_data'] ?? [];
        $rawChannel = is_array($rawChannel) ? $rawChannel : [];

        $isVietnamFb =
            strtolower((string) ($providerService->provider?->driver ?? ''))
            === 'vietnamfb';

        $validLimit = static fn ($value): bool =>
            is_numeric($value) && (int) $value > 0;

        $minVerified = !$isVietnamFb
            || $validLimit($rawChannel['min'] ?? null);

        $maxVerified = !$isVietnamFb
            || $validLimit($rawChannel['max'] ?? null);

        if ($isVietnamFb) {
            $minVerified = $minVerified
                || (
                    ($providerData['min_verified'] ?? false) === true
                    && $validLimit($providerData['min'] ?? null)
                );

            $maxVerified = $maxVerified
                || (
                    ($providerData['max_verified'] ?? false) === true
                    && $validLimit($providerData['max'] ?? null)
                );
        }

        $providerMin = $isVietnamFb
            ? ($rawChannel['min'] ?? $providerData['min'] ?? null)
            : $providerService->min_quantity;

        $providerMax = $isVietnamFb
            ? ($rawChannel['max'] ?? $providerData['max'] ?? null)
            : $providerService->max_quantity;

        if (
            $minVerified
            && $validLimit($providerMin)
            && $quantity < (int) $providerMin
        ) {
            throw new RuntimeException(
                'Số lượng tối thiểu của nhà cung cấp là '
                .number_format((int) $providerMin, 0, ',', '.')
                .'.'
            );
        }

        if (
            $maxVerified
            && $validLimit($providerMax)
            && $quantity > (int) $providerMax
        ) {
            throw new RuntimeException(
                'Số lượng tối đa của nhà cung cấp là '
                .number_format((int) $providerMax, 0, ',', '.')
                .'.'
            );
        }

        // SOCIAL_API_BALANCE_GUARD_V1
        // Kiểm tra số dư thực tế trước khi tạo đơn và trừ xu.
        try {
            $api = app(SocialProviderManager::class)
                ->make($providerService->provider);

            $balanceResponse = $api->balance();

            $balance = null;

            foreach ([
                'balance',
                'data.balance',
                'data.user.balance',
                'money',
            ] as $path) {
                $value = data_get($balanceResponse, $path);

                if ($value !== null && is_numeric($value)) {
                    $balance = (float) $value;
                    break;
                }
            }

            if ($balance === null || !is_finite($balance) || $balance < 0) {
                throw new RuntimeException('Không xác minh được số dư API.');
            }

            $exchangeRate = (float) (
                $providerService->provider->exchange_rate_to_vnd ?: 1
            );

            if (!is_finite($exchangeRate) || $exchangeRate <= 0) {
                throw new RuntimeException('Tỷ giá API không hợp lệ.');
            }

            $availableVnd = $balance * $exchangeRate;

            $requiredVnd = ($providerService->costPriceVnd() * ($isVietnamFb ? 1000 : 1))
                * $quantity / 1000;

            if ($availableVnd < $requiredVnd) {
                throw new RuntimeException('API không đủ số dư.');
            }
        } catch (\Throwable $e) {
            throw new RuntimeException(
                'Dịch vụ hiện chưa thể xử lý. Vui lòng liên hệ Admin để được hỗ trợ.'
            );
        }

        $costPer1000 = ($providerService->costPriceVnd() * ($isVietnamFb ? 1000 : 1));

        if (
            (float) $service->sell_price_per_1000
            <= $costPer1000
        ) {
            throw new RuntimeException(
                'Dịch vụ hiện chưa thể xử lý. Vui lòng liên hệ Admin để được hỗ trợ.'
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
            ($providerService->costPriceVnd() * ($isVietnamFb ? 1000 : 1))
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
                $options,
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
                    if (
                        (int) $existing->user_id !== (int) $user->id
                        || (int) $existing->social_service_id !== (int) $service->id
                        || trim((string) $existing->target) !== trim($target)
                        || (int) $existing->quantity !== $quantity
                        || (array) ($existing->order_options ?? []) !== $options
                    ) {
                        throw new RuntimeException(
                            'Khóa đặt đơn đã được sử dụng cho nội dung khác.'
                        );
                    }

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

                    'order_options' =>
                        $options,

                    'attempts' =>
                        0,
                ]);

                $order->code =
                    'NS-' . str_pad(
                        (string) $order->id,
                        6,
                        '0',
                        STR_PAD_LEFT
                    );

                $order->save();

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
                if ($locked->admin_no_refund) {
                    throw new \RuntimeException('Đơn đã đóng không hoàn tiền.');
                }


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

    public function refundPartial(
        SocialOrder $order
    ): SocialOrder {
        if (!$order->user_id) {
            throw new RuntimeException(
                'Đơn hàng không có tài khoản để hoàn tiền.'
            );
        }

        return DB::transaction(
            function () use ($order) {
                $locked =
                    SocialOrder::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $order->id
                        );
                if ($locked->admin_no_refund) {
                    throw new \RuntimeException('Đơn đã đóng không hoàn tiền.');
                }


                $quantity =
                    max(
                        1,
                        (int) $locked->quantity
                    );

                $remains =
                    max(
                        0,
                        min(
                            $quantity,
                            (int) $locked->remains
                        )
                    );

                $sellAmount =
                    (float)
                        $locked->sell_amount;

                /*
                 * Tiền tương ứng phần chưa chạy.
                 */
                $shouldRefund =
                    round(
                        $sellAmount
                        * $remains
                        / $quantity,
                        4
                    );

                $alreadyRefunded =
                    (float)
                        $locked->refunded_amount;

                $refund =
                    max(
                        0,
                        $shouldRefund
                        - $alreadyRefunded
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
                        'Hoàn phần còn lại đơn '
                        .$locked->code,
                    meta: [
                        'order_code' =>
                            $locked->code,
                        'quantity' =>
                            $quantity,
                        'remains' =>
                            $remains,
                    ]
                );

                $locked->refunded_amount =
                    $alreadyRefunded
                    + $refund;

                $locked->save();

                return $locked->fresh();
            },
            3
        );
    }

    private function orderCode(): string
    {
        return 'TMP-' . Str::uuid();
    }
}
