<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use App\Models\Report;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'reports' => [
                    'total' =>
                        Report::count(),

                    'pending' =>
                        Report::where(
                            'status',
                            'pending'
                        )->count(),

                    'approved' =>
                        Report::where(
                            'status',
                            'approved'
                        )->count(),

                    'rejected' =>
                        Report::where(
                            'status',
                            'rejected'
                        )->count(),
                ],

                'entities' => [
                    'total' =>
                        Entity::count(),

                    'public_alerts' =>
                        Entity::query()
                            ->where(
                                'is_active',
                                true
                            )
                            ->where(
                                'report_count',
                                '>',
                                0
                            )
                            ->count(),
                ],
            ],
        ]);
    }
}