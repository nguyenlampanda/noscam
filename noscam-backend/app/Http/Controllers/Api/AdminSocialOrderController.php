<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Services\Social\SocialOrderProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminSocialOrderController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $query = SocialOrder::query()
            ->with([
                'user:id,name,email',
                'service:id,code,name,platform,category',
                'provider:id,name,slug,status',
                'providerService:id,social_provider_id,provider_service_id,provider_service_name,cost_price_per_1000,priority,is_active',
            ]);

        // NOSCAM_SOCIAL_ORDER_FILTER_V3
        $status = trim((string) $request->input('status', ''));

        if ($status === 'api_reconciliation') {
            $query->where('status', 'pending')
                ->whereNull('provider_order_id')
                ->where('attempts', '>=', 1);
        } elseif ($status === 'pending') {
            $query->where('status', 'pending')
                ->whereNull('provider_order_id')
                ->where('attempts', 0);
        } elseif ($status !== '') {
            $query->where('status', $status);
        }

        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input('search')
            );

            $query->where(function ($q) use ($search) {
                $q->where(
                    'code',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'target',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'provider_order_id',
                    'like',
                    "%{$search}%"
                );
            });
        }

        return response()->json(
            $query->latest()->paginate(50)
        );
    }


    public function audit(): JsonResponse
    {
        $orders = SocialOrder::query()
            ->with([
                'user:id,name,email',
                'service:id,name,platform',
                'provider:id,name,slug',
            ])
            ->where('status', 'pending')
            ->whereNull('provider_order_id')
            ->where('attempts', '>=', 1)
            ->orderBy('id')
            ->paginate(50);

        return response()->json($orders);
    }

    public function show(
        SocialOrder $order
    ): JsonResponse {
        $order->load([
            'user:id,name,email',
            'service',
            'provider:id,name,slug,status',
            'providerService',
        ]);

        return response()->json([
            'data' => $order,
        ]);
    }

    public function cancel(
        Request $request,
        SocialOrder $order,
        SocialOrderProviderService $providerService
    ): JsonResponse {
        $order = $providerService->cancel(
            $order,
            $request->user()?->id
        );

        return response()->json([
            'message' => $order->status === 'cancelled'
                ? 'Đã hủy đơn và xử lý hoàn tiền.'
                : 'Đã gửi yêu cầu hủy đến nhà cung cấp.',
            'data' => $order,
        ]);
    }

    public function cancelWithoutRefund(Request $request, SocialOrder $order): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'required|string|min:10|max:2000',
            'confirmation' => 'required|in:CANCEL_NO_REFUND',
        ]);
        if (!Schema::hasColumn('social_orders', 'admin_no_refund') ||
            !Schema::hasTable('social_order_admin_closures')) {
            return response()->json(['message' => 'Chưa chạy migration.'], 503);
        }
        $lock = Cache::lock('social-order-operation-'.$order->id, 120);
        if (!$lock->get()) {
            return response()->json(['message' => 'Đơn đang được xử lý. Vui lòng thử lại.'], 409);
        }
        try {
            $result = DB::transaction(function () use ($order, $request, $data) {
                $locked = SocialOrder::query()->lockForUpdate()->findOrFail($order->id);
                if ($locked->admin_no_refund) {
                    return $locked;
                }
                DB::table('social_order_admin_closures')->insert([
                    'social_order_id' => $locked->id,
                    'admin_id' => $request->user()->id,
                    'status_before' => $locked->status,
                    'status_after' => 'cancelled',
                    'refunded_before' => $locked->refunded_amount,
                    'reason' => trim($data['reason']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $locked->admin_no_refund = true;
                $locked->status = 'cancelled';
                $locked->save();
                return $locked->fresh();
            }, 3);
            return response()->json([
                'message' => 'Đã đóng đơn nội bộ, không hoàn tiền và không gọi Provider.',
                'data' => $result,
            ]);
        } finally {
            $lock->release();
        }
    }

    public function updateStatus(
        Request $request,
        SocialOrder $order
    ): JsonResponse {
        return response()->json([
            'message' =>
                'Không cho phép đổi trạng thái đơn thủ công. '
                .'Trạng thái phải được xác nhận qua Provider '
                .'hoặc quy trình đối soát riêng.',
        ], 409);
    }
}
