<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeTaskPrice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminExchangeTaskPriceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        return response()->json([
            'data' => ExchangeTaskPrice::query()
                ->orderBy('platform')
                ->orderBy('task_type')
                ->get(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $data = $request->validate([
            'platform' => [
                'required',
                Rule::in(['instagram', 'tiktok', 'facebook']),
            ],
            'task_type' => [
                'required',
                Rule::in(['follow', 'like', 'comment']),
            ],
            'cost_per_task' => [
                'required',
                'numeric',
                'gt:0',
                'integer',
                'max:999999999',
            ],
            'reward_per_task' => [
                'required',
                'numeric',
                'gt:0',
                'integer',
                'max:999999999',
            ],
            'min_quantity' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'is_enabled' => ['required', 'boolean'],
        ]);

        if (
            (float) $data['cost_per_task'] <
            (float) $data['reward_per_task']
        ) {
            throw ValidationException::withMessages([
                'reward_per_task' =>
                    'Xu người nhận không được lớn hơn xu người tạo trả.',
            ]);
        }

        $price = DB::transaction(function () use ($data, $request) {
            return ExchangeTaskPrice::query()->updateOrCreate(
                [
                    'platform' => $data['platform'],
                    'task_type' => $data['task_type'],
                ],
                [
                    'cost_per_task' => $data['cost_per_task'],
                    'reward_per_task' => $data['reward_per_task'],
                    'min_quantity' => $data['min_quantity'] ?? (ExchangeTaskPrice::query()
                        ->where('platform', $data['platform'])
                        ->where('task_type', $data['task_type'])
                        ->value('min_quantity') ?? 10),
                    'is_enabled' => $data['is_enabled'],
                    'updated_by' => $request->user()->id,
                ]
            );
        });

        return response()->json([
            'message' => 'Đã cập nhật giá nhiệm vụ.',
            'data' => $price,
        ]);
    }
}
