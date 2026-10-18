<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeTaskPrice;
use Illuminate\Http\JsonResponse;

class ExchangeTaskPriceController extends Controller
{
    public function index(): JsonResponse
    {
        $prices = ExchangeTaskPrice::query()
            ->where('is_enabled', true)
            ->orderBy('platform')
            ->orderBy('task_type')
            ->get()
            ->map(function (ExchangeTaskPrice $price) {
                $cost = (int) $price->cost_per_task;
                $reward = (int) $price->reward_per_task;

                return [
                    'platform' => $price->platform,
                    'task_type' => $price->task_type,
                    'cost_per_task' => $cost,
                    'reward_per_task' => $reward,
                    'min_quantity' => (int) $price->min_quantity,
                    'platform_fee' => $cost - $reward,
                    'currency' => 'VND',
                ];
            });

        return response()->json([
            'data' => $prices,
        ]);
    }
}
