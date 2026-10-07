<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Services\Social\SocialOrderService;
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
                'service:id,code,name,platform',
                'provider:id,name,slug',
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
                    'provider:id,name,slug',
                ]),
        ]);
    }
}
