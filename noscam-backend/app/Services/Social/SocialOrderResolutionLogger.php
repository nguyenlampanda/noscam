<?php

namespace App\Services\Social;

use App\Models\SocialOrder;
use App\Models\SocialOrderAudit;
use App\Models\SocialOrderResolution;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SocialOrderResolutionLogger
{
    public function record(
        SocialOrder $order,
        SocialOrderAudit $audit,
        int $adminId,
        string $action,
        string $statusBefore,
        string $statusAfter,
        float $refundAmount = 0,
        ?string $note = null
    ): SocialOrderResolution {
        if (DB::transactionLevel() < 1) {
            throw new RuntimeException(
                'Nhật ký xử lý phải được ghi trong giao dịch database.'
            );
        }

        if ((int) $audit->social_order_id !== (int) $order->id) {
            throw new RuntimeException(
                'Biên bản không thuộc đơn hàng.'
            );
        }

        if (!in_array($action, [
            'provider_order_recovered',
            'refund_after_reconciliation',
        ], true)) {
            throw new RuntimeException(
                'Hành động xử lý không hợp lệ.'
            );
        }

        if (SocialOrderResolution::query()
            ->where('social_order_id', $order->id)
            ->exists()) {
            throw new RuntimeException(
                'Đơn đã có quyết định xử lý cuối cùng.'
            );
        }

        return SocialOrderResolution::create([
            'social_order_id' => $order->id,
            'social_order_audit_id' => $audit->id,
            'admin_id' => $adminId,
            'action' => $action,
            'status_before' => $statusBefore,
            'status_after' => $statusAfter,
            'provider_order_id' => $order->provider_order_id,
            'refund_amount' => $refundAmount,
            'note' => $note,
        ]);
    }
}
