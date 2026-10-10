<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Models\SocialOrderAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminSocialOrderAuditController extends Controller
{
    public function index(SocialOrder $order): JsonResponse
    {
        return response()->json([
            'data' => SocialOrderAudit::query()
                ->with('admin:id,name,email')
                ->where('social_order_id', $order->id)
                ->latest()
                ->paginate(30),
        ]);
    }

    public function store(
        Request $request,
        SocialOrder $order
    ): JsonResponse {
        $data = $request->validate([
            'result' => [
                'required',
                Rule::in([
                    'provider_received',
                    'provider_not_received',
                    'uncertain',
                ]),
            ],
            'provider_order_id' => [
                'nullable',
                'string',
                'max:191',
                'required_if:result,provider_received',
            ],
            'note' => [
                'required',
                'string',
                'min:10',
                'max:5000',
            ],
            'evidence' => [
                'required',
                'string',
                'min:10',
                'max:10000',
            ],
        ]);

        $audit = DB::transaction(function () use (
            $order,
            $request,
            $data
        ) {
            $locked = SocialOrder::query()
                ->lockForUpdate()
                ->findOrFail($order->id);

            if (
                $locked->status !== 'pending' ||
                $locked->provider_order_id ||
                (int) $locked->attempts < 1
            ) {
                throw ValidationException::withMessages([
                    'order' =>
                        'Đơn không thuộc diện cần đối soát.',
                ]);
            }

            return SocialOrderAudit::create([
                'social_order_id' => $locked->id,
                'admin_id' => $request->user()->id,
                'result' => $data['result'],
                'provider_order_id' =>
                    $data['result'] === 'provider_received'
                        ? trim($data['provider_order_id'])
                        : null,
                'note' => trim($data['note']),
                'evidence' => trim($data['evidence']),
            ]);
        });

        return response()->json([
            'message' => 'Đã lưu biên bản đối soát.',
            'data' => $audit->load('admin:id,name,email'),
        ], 201);
    }
}
