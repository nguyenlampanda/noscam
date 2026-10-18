<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeTaskDispute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminExchangeDisputeListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'status' => [
                'sometimes',
                'string',
                'in:pending,approved,rejected',
            ],
            'per_page' => [
                'sometimes',
                'integer',
                'min:1',
                'max:50',
            ],
        ]);

        $query = ExchangeTaskDispute::query()
            ->select([
                'id',
                'claim_id',
                'opened_by',
                'status',
                'appeal_reason',
                'admin_reason',
                'resolved_by',
                'resolved_at',
                'created_at',
            ])
            ->with([
                'claim' => function ($query) {
                    $query->select([
                        'id',
                        'campaign_id',
                        'worker_user_id',
                        'submitted_username',
                        'submitted_profile_url',
                        'status',
                        'risk_hold',
                        'submitted_at',
                        'rejected_at',
                    ]);
                },
            ]);

        $query->where(
            'status',
            $validated['status'] ?? 'pending'
        );

        return response()->json(
            $query
                ->orderByDesc('id')
                ->paginate($validated['per_page'] ?? 15)
        );
    }
}
