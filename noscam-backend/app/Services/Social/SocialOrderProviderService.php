<?php

namespace App\Services\Social;

use App\Models\SocialOrder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class SocialOrderProviderService
{
    public function __construct(
        private SocialProviderManager $providers,
        private SocialOrderService $orders
    ) {
    }

    public function submit(
        SocialOrder $order
    ): SocialOrder {
        $lock = Cache::lock(
            'social-order-submit-'.$order->id,
            60
        );

        if (!$lock->get()) {
            throw new RuntimeException(
                'Đơn đang được tiến trình khác xử lý.'
            );
        }

        try {
            /*
             * Luôn đọc lại DB sau khi có lock.
             */
            $order = SocialOrder::query()
                ->with([
                    'provider',
                    'providerService',
                ])
                ->findOrFail(
                    $order->id
                );

            if ($order->provider_order_id) {
                return $order;
            }

            if ($order->status !== 'pending') {
                throw new RuntimeException(
                    'Đơn không còn ở trạng thái chờ xử lý.'
                );
            }

            if (!$order->provider) {
                throw new RuntimeException(
                    'Đơn chưa có nhà cung cấp.'
                );
            }

            if (!$order->providerService) {
                throw new RuntimeException(
                    'Đơn chưa có dịch vụ API.'
                );
            }

            if (
                (int) $order->attempts >= 3
            ) {
                throw new RuntimeException(
                    'Đơn đã vượt quá số lần thử gửi API.'
                );
            }

            if (
                $order->provider->driver ===
                'vietnamfb'
            ) {
                throw new RuntimeException(
                    'VietnamFB chưa bật gửi đơn tự động.'
                );
            }

            if (
                !in_array(
                    $order->provider->driver,
                    [
                        'nganhangsub',
                        'hacklike17',
                    ],
                    true
                )
            ) {
                throw new RuntimeException(
                    'Provider chưa hỗ trợ gửi đơn tự động.'
                );
            }

            /*
             * Đánh dấu attempt TRƯỚC khi gọi provider.
             */
            $order->attempts =
                (int) $order->attempts + 1;

            $order->provider_error = null;
            $order->save();

            try {
                $api =
                    $this->providers->make(
                        $order->provider
                    );

                $response =
                    $api->createOrder(
                        (string)
                            $order
                                ->providerService
                                ->provider_service_id,
                        (string)
                            $order->target,
                        (int)
                            $order->quantity
                    );

                $providerOrderId =
                    $response['order']
                    ?? $response['order_id']
                    ?? $response['id']
                    ?? null;

                if (
                    $providerOrderId === null ||
                    $providerOrderId === ''
                ) {
                    throw new RuntimeException(
                        'Provider không trả về mã đơn.'
                    );
                }

                DB::transaction(
                    function () use (
                        $order,
                        $response,
                        $providerOrderId
                    ) {
                        $locked =
                            SocialOrder::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $order->id
                                );

                        if (
                            $locked
                                ->provider_order_id
                        ) {
                            return;
                        }

                        $locked
                            ->provider_order_id =
                            (string)
                                $providerOrderId;

                        $locked->provider_response =
                            $response;

                        $locked->provider_error =
                            null;

                        $locked->submitted_at =
                            now();

                        $locked->last_synced_at =
                            null;

                        $locked->status =
                            'processing';

                        $locked->save();
                    },
                    3
                );
            } catch (Throwable $e) {
                $failed =
                    SocialOrder::query()
                        ->find(
                            $order->id
                        );

                if (
                    $failed &&
                    !$failed->provider_order_id
                ) {
                    $failed->provider_error =
                        mb_substr(
                            $e->getMessage(),
                            0,
                            2000
                        );

                    $failed->save();
                }

                throw $e;
            }

            return SocialOrder::query()
                ->with([
                    'service',
                    'provider',
                    'providerService',
                ])
                ->findOrFail(
                    $order->id
                );
        } finally {
            $lock->release();
        }
    }

    public function sync(
        SocialOrder $order
    ): SocialOrder {
        $lock = Cache::lock(
            'social-order-sync-'.$order->id,
            45
        );

        if (!$lock->get()) {
            return $order->fresh();
        }

        try {
            $order =
                SocialOrder::query()
                    ->with([
                        'provider',
                        'providerService',
                    ])
                    ->findOrFail(
                        $order->id
                    );

            if (
                !$order->provider ||
                !$order->provider_order_id
            ) {
                return $order;
            }

            if (
                !in_array(
                    $order->status,
                    [
                        'processing',
                        'in_progress',
                    ],
                    true
                )
            ) {
                return $order;
            }

            if (
                $order->provider->driver ===
                'vietnamfb'
            ) {
                return $order;
            }

            $api =
                $this->providers->make(
                    $order->provider
                );

            $response =
                $api->orderStatus(
                    (string)
                        $order
                            ->provider_order_id
                );

            $providerStatus =
                strtolower(
                    trim(
                        (string) (
                            $response['status']
                            ?? ''
                        )
                    )
                );

            $status =
                $this->mapStatus(
                    $providerStatus
                );

            $remains =
                isset(
                    $response['remains']
                )
                    ? max(
                        0,
                        (int)
                            $response[
                                'remains'
                            ]
                    )
                    : null;

            $startCount =
                isset(
                    $response['start_count']
                )
                    ? max(
                        0,
                        (int)
                            $response[
                                'start_count'
                            ]
                    )
                    : null;

            $order =
                DB::transaction(
                    function () use (
                        $order,
                        $response,
                        $status,
                        $remains,
                        $startCount
                    ) {
                        $locked =
                            SocialOrder::query()
                                ->lockForUpdate()
                                ->findOrFail(
                                    $order->id
                                );

                        $locked
                            ->provider_response =
                            $response;

                        $locked
                            ->provider_error =
                            null;

                        $locked
                            ->last_synced_at =
                            now();

                        if ($status) {
                            $locked->status =
                                $status;
                        }

                        if (
                            $remains !== null
                        ) {
                            $locked->remains =
                                min(
                                    (int)
                                        $locked
                                            ->quantity,
                                    $remains
                                );
                        }

                        if (
                            $startCount !==
                            null
                        ) {
                            $locked->start_count =
                                $startCount;
                        }

                        if (
                            $status ===
                            'completed'
                        ) {
                            $locked->remains = 0;

                            $locked
                                ->completed_at =
                                $locked
                                    ->completed_at
                                ?? now();
                        }

                        $locked->save();

                        return $locked->fresh();
                    },
                    3
                );

            if (
                in_array(
                    $order->status,
                    [
                        'failed',
                        'cancelled',
                    ],
                    true
                )
            ) {
                $order =
                    $this->orders->refund(
                        $order
                    );
            }

            if (
                $order->status ===
                'partial'
            ) {
                $order =
                    $this->orders
                        ->refundPartial(
                            $order
                        );
            }

            return $order
                ->fresh()
                ->load([
                    'service',
                    'provider',
                    'providerService',
                ]);
        } finally {
            $lock->release();
        }
    }

    public function cancel(
        SocialOrder $order,
        ?int $createdBy = null
    ): SocialOrder {
        $lock = Cache::lock(
            'social-order-cancel-'.$order->id,
            60
        );

        if (!$lock->get()) {
            throw new RuntimeException(
                'Đơn đang được xử lý.'
            );
        }

        try {
            $order =
                SocialOrder::query()
                    ->with([
                        'provider',
                        'providerService',
                    ])
                    ->findOrFail(
                        $order->id
                    );

            if (
                in_array(
                    $order->status,
                    [
                        'completed',
                        'partial',
                        'cancelled',
                        'failed',
                    ],
                    true
                )
            ) {
                throw new RuntimeException(
                    'Đơn này không thể hủy.'
                );
            }

            /*
             * Chưa gửi provider:
             * hủy + hoàn tiền ngay.
             */
            if (
                !$order->provider_order_id
            ) {
                $order->status =
                    'cancelled';

                $order->save();

                return $this->orders
                    ->refund(
                        $order,
                        $createdBy
                    );
            }

            if (!$order->provider) {
                throw new RuntimeException(
                    'Không tìm thấy provider.'
                );
            }

            if (
                $order->provider->driver ===
                'vietnamfb'
            ) {
                throw new RuntimeException(
                    'VietnamFB chưa hỗ trợ hủy tự động.'
                );
            }

            /*
             * Đơn đã gửi:
             * chỉ yêu cầu provider hủy.
             * KHÔNG hoàn tiền ngay.
             */
            $api =
                $this->providers->make(
                    $order->provider
                );

            $response =
                $api->cancel(
                    (string)
                        $order
                            ->provider_order_id
                );

            $order->provider_response =
                $response;

            $order->provider_error = null;

            /*
             * Giữ processing/in_progress.
             * Scheduler sẽ sync và chỉ hoàn tiền
             * khi provider xác nhận cancelled.
             */
            $order->last_synced_at =
                now();

            $order->save();

            return $order->fresh();
        } finally {
            $lock->release();
        }
    }

    private function mapStatus(
        string $status
    ): ?string {
        return match ($status) {
            'pending',
            'awaiting',
            'waiting' =>
                'processing',

            'processing',
            'in progress',
            'in_progress',
            'progress' =>
                'in_progress',

            'completed',
            'complete',
            'done',
            'success',
            'successful' =>
                'completed',

            'partial',
            'partially completed' =>
                'partial',

            'canceled',
            'cancelled' =>
                'cancelled',

            'failed',
            'error' =>
                'failed',

            default => null,
        };
    }
}
