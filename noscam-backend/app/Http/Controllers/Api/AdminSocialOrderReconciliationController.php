<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Models\SocialOrderAudit;
use App\Services\Social\SocialOrderReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

class AdminSocialOrderReconciliationController extends Controller
{
    public function resolve(
        Request $request,
        SocialOrder $order,
        SocialOrderReconciliationService $service
    ): JsonResponse {
        $data = $request->validate([
            'audit_id' => 'required|integer',
            'confirmation' => [
                'required',
                Rule::in(['CONFIRM_RECONCILIATION']),
            ],
        ]);

        $audit = SocialOrderAudit::query()
            ->where('social_order_id', $order->id)
            ->findOrFail($data['audit_id']);

        try {
            $resolved = $service->resolve(
                $order,
                $audit,
                $request->user()->id
            );
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 409);
        }

        return response()->json([
            'message' => 'Đã xử lý đối soát thành công.',
            'data' => $resolved,
        ]);
    }
}
