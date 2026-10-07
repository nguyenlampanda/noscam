<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Models\SocialService;
use App\Services\Social\SocialOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialOrderController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $orders = SocialOrder::query()
            ->where(
                'user_id',
                $request->user()->id
            )
            ->with([
                'service:id,code,name,platform,category',
            ])
            ->latest()
            ->paginate(30);

        return response()->json($orders);
    }

    public function show(
        Request $request,
        SocialOrder $order
    ): JsonResponse {
        abort_unless(
            (int) $order->user_id ===
            (int) $request->user()->id,
            404
        );

        $order->load([
            'service:id,code,name,platform,category',
        ]);

        return response()->json([
            'data' => $order,
        ]);
    }

    public function store(
        Request $request,
        SocialOrderService $orderService
    ): JsonResponse {
        $data = $request->validate([
            'service_id' => [
                'required',
                'integer',
                'exists:social_services,id',
            ],
            'target' => [
                'required',
                'string',
                'max:2000',
            ],
            'quantity' => [
                'required',
                'integer',
                'min:1',
                'max:100000000',
            ],
            'idempotency_key' => [
                'required',
                'string',
                'min:16',
                'max:100',
            ],
        ]);

        $service =
            SocialService::findOrFail(
                $data['service_id']
            );

        $order = $orderService->create(
            user: $request->user(),
            service: $service,
            target: $data['target'],
            quantity: (int) $data['quantity'],
            idempotencyKey:
                $data['idempotency_key']
        );

        return response()->json([
            'message' =>
                'Đặt đơn thành công.',
            'data' =>
                $order,
        ], 201);
    }
}
