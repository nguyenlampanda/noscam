<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Services\Social\SocialOrderService;
use App\Services\Social\SocialOrderProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->string('status')
            );
        }

        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input(
                    'search'
                )
            );

            $query->where(
                function ($q) use ($search) {
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
                }
            );
        }

        return response()->json(
            $query
                ->latest()
                ->paginate(50)
        );
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

    public function updateStatus(
        Request $request,
        SocialOrder $order,
        SocialOrderService $orderService
    ): JsonResponse {
        $data = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'pending',
                    'processing',
                    'in_progress',
                    'completed',
                    'partial',
                    'cancelled',
                    'failed',
                ]),
            ],
        ]);

        $status = $data['status'];

        $order->status = $status;

        if ($status === 'completed') {
            $order->remains = 0;
            $order->completed_at = now();
        }

        $order->save();

        if (
            in_array(
                $status,
                ['failed', 'cancelled'],
                true
            )
        ) {
            $order =
                $orderService->refund(
                    $order,
                    $request->user()?->id
                );
        }

        return response()->json([
            'message' =>
                'Đã cập nhật trạng thái đơn.',
            'data' =>
                $order->fresh()->load([
                    'user:id,name,email',
                    'service',
                    'provider:id,name,slug,status',
                    'providerService',
                ]),
        ]);
    }
}
