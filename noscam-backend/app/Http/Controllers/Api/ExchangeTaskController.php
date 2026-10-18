<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExchangeTaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $campaigns = ExchangeCampaign::query()
            ->where('status', 'active')
            ->where('user_id', '!=', $userId)
            ->whereDoesntHave('claims', function ($query) use ($userId) {
                $query->where('worker_user_id', $userId);
            })
            ->whereRaw(
                '(SELECT COUNT(*) FROM exchange_task_claims
                  WHERE exchange_task_claims.campaign_id = exchange_campaigns.id)
                 < exchange_campaigns.quantity'
            )
            // Ngân sách phải đủ cho các claim chưa hoàn tất
            // và thêm một nhiệm vụ mới.
            ->whereRaw(
                'exchange_campaigns.budget_held >=
                 (
                    (
                        SELECT COUNT(*)
                        FROM exchange_task_claims
                        WHERE exchange_task_claims.campaign_id =
                              exchange_campaigns.id
                          AND exchange_task_claims.status IN
                              (?, ?, ?, ?)
                    ) + 1
                 ) * exchange_campaigns.cost_per_task',
                ['claimed', 'submitted', 'rejected', 'disputed']
            )
            ->orderByDesc('id')
            ->paginate(15);

        $campaigns->getCollection()->transform(
            function (ExchangeCampaign $campaign) {
                return [
                    'id' => $campaign->id,
                    'platform' => $campaign->platform,
                    'task_type' => $campaign->task_type,
                    'target_url' => $campaign->target_url,
                    'reward_per_task' => (int) $campaign->reward_per_task,
                    'currency' => 'VND',
                ];
            }
        );

        return response()->json($campaigns);
    }

    public function mine(Request $request): JsonResponse
    {
        $claims = \App\Models\ExchangeTaskClaim::query()
            ->where('worker_user_id', $request->user()->id)
            ->with([
                'campaign:id,platform,task_type,target_url,reward_per_task',
                'socialAccount:id,username',
            ])
            ->orderByDesc('id')
            ->paginate(15);

        $claims->getCollection()->transform(function ($claim) {
            $campaign = $claim->campaign;

            return [
                'id' => $claim->id,
                'campaign_id' => $claim->campaign_id,
                'social_account_id' => $claim->social_account_id,
                'social_username' => $claim->socialAccount?->username,
                'platform' => $campaign?->platform,
                'task_type' => $campaign?->task_type,
                'target_url' => $campaign?->target_url,
                'reward_per_task' => $campaign
                    ? (int) $campaign->reward_per_task
                    : null,
                'currency' => 'VND',
                'status' => $claim->status,
                'claimed_at' => $claim->claimed_at,
                'submitted_at' => $claim->submitted_at,
                'review_deadline_at' => $claim->review_deadline_at,
                'rejected_at' => $claim->rejected_at,
                'rejection_reason' => $claim->rejection_reason,
                'appeal_deadline_at' => $claim->appeal_deadline_at,
                'settled_at' => $claim->settled_at,
                'finalized_at' => $claim->finalized_at,
                'risk_hold' => (bool) $claim->risk_hold,
            ];
        });

        return response()->json($claims);
    }

    public function claim(
        Request $request,
        int $campaignId,
        \App\Services\Exchange\ExchangeClaimService $service
    ): JsonResponse {
        $validated = $request->validate([
            'social_account_id' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $claim = $service->claim(
                $campaignId,
                $request->user(),
                (int) $validated['social_account_id']
            );
        } catch (\RuntimeException $exception) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'task' => [$exception->getMessage()],
            ]);
        }

        return response()->json([
            'id' => $claim->id,
            'campaign_id' => $claim->campaign_id,
            'social_account_id' => $claim->social_account_id,
            'status' => $claim->status,
            'claimed_at' => $claim->claimed_at,
        ], 201);
    }

    public function submit(
        Request $request,
        int $claimId,
        \App\Services\Exchange\ExchangeClaimService $service
    ): JsonResponse {
        try {
            $claim = $service->submit(
                $claimId,
                $request->user()
            );
        } catch (\RuntimeException $exception) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'task' => [$exception->getMessage()],
            ]);
        }

        return response()->json([
            'id' => $claim->id,
            'campaign_id' => $claim->campaign_id,
            'social_account_id' => $claim->social_account_id,
            'status' => $claim->status,
            'submitted_at' => $claim->submitted_at,
            'review_deadline_at' => $claim->review_deadline_at,
        ]);
    }

    public function approve(
        Request $request,
        int $claimId,
        \App\Services\Exchange\ExchangeClaimService $service
    ): JsonResponse {
        try {
            $claim = $service->approve(
                $claimId,
                $request->user()
            );
        } catch (\RuntimeException $exception) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'task' => [$exception->getMessage()],
            ]);
        }

        return response()->json([
            'id' => $claim->id,
            'campaign_id' => $claim->campaign_id,
            'status' => $claim->status,
            'settled_at' => $claim->settled_at,
            'finalized_at' => $claim->finalized_at,
        ]);
    }

    public function reject(
        Request $request,
        int $claimId,
        \App\Services\Exchange\ExchangeClaimService $service
    ): JsonResponse {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:1', 'max:2000'],
        ]);

        try {
            $claim = $service->reject(
                $claimId,
                $request->user(),
                $validated['reason']
            );
        } catch (\RuntimeException $exception) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'task' => [$exception->getMessage()],
            ]);
        }

        return response()->json([
            'id' => $claim->id,
            'campaign_id' => $claim->campaign_id,
            'status' => $claim->status,
            'rejection_reason' => $claim->rejection_reason,
            'rejected_at' => $claim->rejected_at,
            'appeal_deadline_at' => $claim->appeal_deadline_at,
        ]);
    }

    public function appeal(
        Request $request,
        int $claimId,
        \App\Services\Exchange\ExchangeClaimService $service
    ): JsonResponse {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:1', 'max:2000'],
        ]);

        try {
            $claim = $service->appeal(
                $claimId,
                $request->user(),
                $validated['reason']
            );
        } catch (\RuntimeException $exception) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'task' => [$exception->getMessage()],
            ]);
        }

        return response()->json([
            'id' => $claim->id,
            'campaign_id' => $claim->campaign_id,
            'status' => $claim->status,
            'appeal_deadline_at' => $claim->appeal_deadline_at,
        ]);
    }
}
