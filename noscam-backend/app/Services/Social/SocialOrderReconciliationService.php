<?php

namespace App\Services\Social;

use App\Models\SocialOrder;
use App\Models\SocialOrderAudit;
use App\Models\SocialOrderResolution;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SocialOrderReconciliationService
{
    public function __construct(
        private SocialOrderService $orders,
        private SocialOrderResolutionLogger $logger
    ) {}

    public function resolve(
        SocialOrder $order,
        SocialOrderAudit $audit,
        int $adminId
    ): SocialOrder {
        $lock = Cache::lock(
            'social-order-operation-'.$order->id,
            120
        );

        if (!$lock->get()) {
            throw new RuntimeException('Đơn đang được xử lý.');
        }

        try {
            return DB::transaction(function () use (
                $order,
                $audit,
                $adminId
            ) {
                $locked = SocialOrder::query()
                    ->lockForUpdate()
                    ->findOrFail($order->id);

                if (
                    $locked->status !== 'pending' ||
                    $locked->provider_order_id ||
                    (int) $locked->attempts < 1
                ) {
                    throw new RuntimeException(
                        'Đơn không còn đủ điều kiện đối soát.'
                    );
                }

                if (SocialOrderResolution::query()
                    ->where('social_order_id', $locked->id)
                    ->exists()) {
                    throw new RuntimeException(
                        'Đơn đã được xử lý đối soát.'
                    );
                }

                $audit = SocialOrderAudit::query()
                    ->where('social_order_id', $locked->id)
                    ->whereKey($audit->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $latestId = SocialOrderAudit::query()
                    ->where('social_order_id', $locked->id)
                    ->latest('id')
                    ->value('id');

                if ((int) $latestId !== (int) $audit->id) {
                    throw new RuntimeException(
                        'Phải sử dụng biên bản mới nhất.'
                    );
                }

                $before = $locked->status;

                if ($audit->result === 'provider_received') {
                    $providerOrderId = trim(
                        (string) $audit->provider_order_id
                    );

                    if ($providerOrderId === '') {
                        throw new RuntimeException(
                            'Thiếu mã đơn Provider.'
                        );
                    }

                    $exists = SocialOrder::query()
                        ->where(
                            'social_provider_id',
                            $locked->social_provider_id
                        )
                        ->where(
                            'provider_order_id',
                            $providerOrderId
                        )
                        ->whereKeyNot($locked->id)
                        ->exists();

                    if ($exists) {
                        throw new RuntimeException(
                            'Mã Provider đã được sử dụng.'
                        );
                    }

                    $locked->provider_order_id = $providerOrderId;
                    $locked->status = 'processing';
                    $locked->provider_error = null;
                    $locked->submitted_at =
                        $locked->submitted_at ?? now();
                    $locked->save();

                    $this->logger->record(
                        $locked,
                        $audit,
                        $adminId,
                        'provider_order_recovered',
                        $before,
                        'processing',
                        0,
                        'Khôi phục mã đơn Provider từ biên bản đối soát.'
                    );

                    return $locked->fresh();
                }

                if ($audit->result === 'provider_not_received') {
                    $locked->status = 'cancelled';
                    $locked->save();

                    $refundedBefore = (float) $locked->refunded_amount;

                    $refunded = $this->orders->refund(
                        $locked,
                        $adminId
                    );

                    $refundAmount = max(
                        0,
                        (float) $refunded->refunded_amount
                        - $refundedBefore
                    );

                    $this->logger->record(
                        $refunded,
                        $audit,
                        $adminId,
                        'refund_after_reconciliation',
                        $before,
                        $refunded->status,
                        $refundAmount,
                        'Hoàn tiền sau khi xác minh Provider không nhận đơn.'
                    );

                    return $refunded->fresh();
                }

                throw new RuntimeException(
                    'Kết quả đối soát chưa xác định.'
                );
            }, 3);
        } finally {
            $lock->release();
        }
    }
}
