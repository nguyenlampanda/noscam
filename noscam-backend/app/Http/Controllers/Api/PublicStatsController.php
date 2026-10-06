<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityFeedback;
use App\Models\Entity;
use App\Models\Report;
use App\Models\SystemCounter;
use Illuminate\Http\JsonResponse;

class PublicStatsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'searches' =>
                    (int) (
                        SystemCounter::query()
                            ->where(
                                'key',
                                'searches'
                            )
                            ->value('value') ?? 0
                    ),

                'reports' =>
                    Report::count(),

                'alerts' =>
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

                'community_feedbacks' =>
                    CommunityFeedback::count(),
            ],
        ]);
    }
}
