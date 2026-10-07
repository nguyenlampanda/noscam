<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Models\SocialProvider;
use App\Models\SocialService;
use App\Models\WalletTopup;
use Illuminate\Http\JsonResponse;

class AdminSocialDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $today = now()->startOfDay();

        return response()->json([
            'data' => [
                'providers' => [
                    'total' => SocialProvider::count(),
                    'active' => SocialProvider::where(
                        'status',
                        'active'
                    )->count(),
                    'error' => SocialProvider::where(
                        'status',
                        'error'
                    )->count(),
                ],

                'services' => [
                    'total' => SocialService::count(),
                    'active' => SocialService::where(
                        'is_active',
                        true
                    )->count(),
                ],

                'orders' => [
                    'total' => SocialOrder::count(),
                    'today' => SocialOrder::where(
                        'created_at',
                        '>=',
                        $today
                    )->count(),
                    'pending' => SocialOrder::whereIn(
                        'status',
                        [
                            'pending',
                            'processing',
                            'in_progress',
                        ]
                    )->count(),
                    'completed' => SocialOrder::where(
                        'status',
                        'completed'
                    )->count(),
                ],

                'money' => [
                    'revenue' => SocialOrder::sum(
                        'sell_amount'
                    ),
                    'cost' => SocialOrder::sum(
                        'cost_amount'
                    ),
                    'profit' => SocialOrder::sum(
                        'profit_amount'
                    ),
                ],

                'topups' => [
                    'pending' => WalletTopup::where(
                        'status',
                        'pending'
                    )->count(),
                ],
            ],
        ]);
    }
}
