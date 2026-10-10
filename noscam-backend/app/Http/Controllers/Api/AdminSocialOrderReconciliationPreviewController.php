<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Models\SocialOrderAudit;
use App\Models\SocialOrderResolution;
use Illuminate\Http\JsonResponse;

class AdminSocialOrderReconciliationPreviewController extends Controller
{
    public function show(SocialOrder $order): JsonResponse
    {
        $order = $order->fresh();

        $audit = SocialOrderAudit::query()
            ->where('social_order_id', $order->id)
            ->latest('id')
            ->first();

        $resolved = SocialOrderResolution::query()
            ->where('social_order_id', $order->id)
            ->exists();

        $eligible =
            $order->status === 'pending' &&
            !$order->provider_order_id &&
            (int) $order->attempts >= 1 &&
            !$resolved &&
            $audit !== null &&
            in_array($audit->result, [
                'provider_received',
                'provider_not_received',
            ], true);

        $action = match ($audit?->result) {
            'provider_received' => 'provider_order_recovered',
            'provider_not_received' => 'refund_after_reconciliation',
            default => null,
        };

        $estimatedRefund = $eligible &&
            $action === 'refund_after_reconciliation'
                ? max(
                    0,
                    (float) $order->sell_amount -
                    (float) $order->refunded_amount
                )
                : 0;

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'order_code' => $order->code,
                'eligible' => $eligible,
                'already_resolved' => $resolved,
                'status' => $order->status,
                'attempts' => (int) $order->attempts,
                'audit_id' => $audit?->id,
                'audit_result' => $audit?->result,
                'action' => $eligible ? $action : null,
                'provider_order_id' => $audit?->provider_order_id,
                'estimated_refund' => $estimatedRefund,
                'execution_enabled' => false,
                'message' => $eligible
                    ? 'Đủ điều kiện dữ liệu sơ bộ. Chưa xác minh độc lập với Provider; chức năng xử lý vẫn khóa.'
                    : 'Đơn chưa đủ điều kiện xử lý đối soát.',
            ],
        ]);
    }
}
