<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminExchangeCampaignController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:draft,active,paused,cancelling,completed,cancelled'],
            'platform' => [
                'sometimes', 'string',
                'in:instagram,tiktok,facebook,youtube,threads,twitter,telegram,zalo,pinterest,linkedin,reddit'
            ],
            'task_type' => [
                'sometimes', 'string',
                'in:follow,like,comment,view,share,subscribe,repost,join,reaction,save,upvote'
            ],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = ExchangeCampaign::query()
            ->select([
                'id',
                'user_id',
                'platform',
                'task_type',
                'target_url',
                'quantity',
                'cost_per_task',
                'reward_per_task',
                'budget_total',
                'budget_held',
                'budget_settled',
                'budget_refunded',
                'status',
                'created_at',
                'updated_at',
            ]);

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (isset($validated['platform'])) {
            $query->where('platform', $validated['platform']);
        }

        if (isset($validated['task_type'])) {
            $query->where('task_type', $validated['task_type']);
        }

        $campaigns = $query
            ->with([
                'user:id,name,email',
                'socialAccount',
            ])
            ->withCount([
                'claims',
                'claims as claimed_count' => function ($q) {
                    $q->where('status', 'claimed');
                },
                'claims as submitted_count' => function ($q) {
                    $q->where('status', 'submitted');
                },
                'claims as approved_count' => function ($q) {
                    $q->where('status', 'settled');
                },
                'claims as rejected_count' => function ($q) {
                    $q->where('status', 'rejected');
                },
                'claims as disputed_count' => function ($q) {
                    $q->where('status', 'disputed');
                },
                'claims as refunded_count' => function ($q) {
                    $q->where('status', 'refunded');
                },
            ])
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15);

        return response()->json($campaigns);
    }

    public function changeStatus(Request $request, int $campaignId): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:pause,resume'],
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $campaign = \Illuminate\Support\Facades\DB::transaction(
            function () use ($campaignId, $validated, $request) {
                $campaign = ExchangeCampaign::query()
                    ->whereKey($campaignId)
                    ->lockForUpdate()
                    ->firstOrFail();

                $expected = $validated['action'] === 'pause'
                    ? 'active'
                    : 'paused';

                $next = $validated['action'] === 'pause'
                    ? 'paused'
                    : 'active';

                if ($campaign->status !== $expected) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'action' => 'Trạng thái chiến dịch không cho phép thao tác này.',
                    ]);
                }

                $campaign->status = $next;
                $campaign->save();

                \Illuminate\Support\Facades\Log::info(
                    'exchange.admin.campaign_status_changed',
                    [
                        'admin_id' => $request->user()->id,
                        'campaign_id' => $campaign->id,
                        'from' => $expected,
                        'to' => $next,
                        'reason' => $validated['reason'],
                    ]
                );

                return $campaign;
            },
            3
        );

        return response()->json([
            'message' => 'Đã cập nhật trạng thái chiến dịch.',
            'campaign' => $campaign,
        ]);
    }



    // NOSCAM_ADMIN_INTERACTION_AUDIT_V1
    public function campaignClaims(
        \Illuminate\Http\Request $request,
        int $campaignId
    ): \Illuminate\Http\JsonResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $campaign = \App\Models\ExchangeCampaign::query()
            ->with(['user:id,name,username', 'socialAccount:id,username,profile_url'])
            ->findOrFail($campaignId);

        $serialize = function ($claim) {
            $target = $claim->campaign;
            $worker = $claim->worker;

            return [
                'id' => $claim->id,
                'campaign_id' => $claim->campaign_id,
                'platform' => $target?->platform,
                'task_type' => $target?->task_type,
                'target_url' => $target?->target_url,
                'target_username' => $target?->socialAccount?->username,
                'target_profile_url' => $target?->socialAccount?->profile_url,
                'status' => $claim->status,
                'reciprocal_status' => $claim->reciprocal_status,
                'worker' => $worker ? [
                    'id' => $worker->id,
                    'name' => $worker->name,
                    'username' => $worker->username,
                ] : null,
                'account_username' => $claim->submitted_username
                    ?: $claim->socialAccount?->username,
                'profile_url' => $claim->submitted_profile_url
                    ?: $claim->socialAccount?->profile_url,
                'return_campaign_id' => $claim->return_campaign_id,
                'return_username' => $claim->return_username,
                'return_profile_url' => $claim->return_profile_url,
                'claimed_at' => $claim->claimed_at,
                'submitted_at' => $claim->submitted_at,
                'reciprocal_submitted_at' => $claim->reciprocal_submitted_at,
                'reciprocal_confirmed_at' => $claim->reciprocal_confirmed_at,
                'rejected_at' => $claim->rejected_at,
                'finalized_at' => $claim->finalized_at,
                'created_at' => $claim->created_at,
            ];
        };

        $relations = [
            'worker:id,name,username',
            'socialAccount:id,username,profile_url',
            'campaign.socialAccount:id,username,profile_url',
        ];

        $claims = \App\Models\ExchangeTaskClaim::query()
            ->where('campaign_id', $campaign->id)
            ->with($relations)
            ->orderBy('id')
            ->get();

        // Lịch sử chủ chiến dịch thực hiện cho người khác.
        // Chỉ lấy nhiệm vụ thuộc chiến dịch miễn phí.
        $performed = [];

        if ($campaign->is_free_reciprocal) {
            $performed = \App\Models\ExchangeTaskClaim::query()
                ->where('worker_user_id', $campaign->user_id)
                ->whereHas('campaign', function ($query) {
                    $query->where('is_free_reciprocal', true);
                })
                ->with($relations)
                ->orderByDesc('id')
                ->limit(100)
                ->get()
                ->map($serialize)
                ->values()
                ->all();
        }

        return response()->json([
            'data' => [
                'campaign_id' => $campaign->id,
                'quantity' => (int) $campaign->quantity,
                'is_free_reciprocal' => (bool) $campaign->is_free_reciprocal,
                'creator' => $campaign->user ? [
                    'id' => $campaign->user->id,
                    'name' => $campaign->user->name,
                    'username' => $campaign->user->username,
                ] : null,
                'receiver' => [
                    'username' => $campaign->socialAccount?->username,
                    'profile_url' => $campaign->socialAccount?->profile_url,
                    'target_url' => $campaign->target_url,
                ],
                'claims' => $claims->map($serialize)->values(),
                'performed_history' => $performed,
                'performed_history_limit' => 100,
            ],
        ]);
    }

    public function requestCancellation(
        \Illuminate\Http\Request $request,
        int $campaignId
    ): \Illuminate\Http\JsonResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $data = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
            'confirm' => ['required', 'accepted'],
        ]);

        try {
            $result = \Illuminate\Support\Facades\DB::transaction(
                function () use ($request, $campaignId, $data) {
                    $campaign = \App\Models\ExchangeCampaign::query()
                        ->whereKey($campaignId)
                        ->lockForUpdate()
                        ->firstOrFail();

                    if (!in_array(
                        $campaign->status,
                        ['active', 'paused', 'cancelled'],
                        true
                    )) {
                        throw new \RuntimeException(
                            'Chiến dịch không ở trạng thái có thể hủy.'
                        );
                    }

                    if ($campaign->status !== 'cancelled') {
                        $campaign->status = 'cancelling';
                        $campaign->save();
                    }

                    return app(
                        \App\Services\Exchange\ExchangeCampaignCancellationService::class
                    )->finalize(
                        (int) $campaign->id,
                        (int) $request->user()->id,
                        $data['reason']
                    );
                },
                3
            );
        } catch (\RuntimeException $error) {
            return response()->json([
                'message' => $error->getMessage(),
            ], 409);
        }

        return response()->json([
            'message' => 'Đã xử lý hủy chiến dịch và hoàn xu còn lại.',
            'data' => $result,
        ]);
    }

    public function finalizeCancellation(
        \Illuminate\Http\Request $request,
        int $campaignId
    ): \Illuminate\Http\JsonResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $data = $request->validate([
            'reason' => 'required|string|min:10|max:2000',
            'confirm' => 'required|accepted',
        ]);

        try {
            $result = app(
                \App\Services\Exchange\ExchangeCampaignCancellationService::class
            )->finalize(
                $campaignId,
                (int) $request->user()->id,
                $data['reason']
            );
        } catch (\RuntimeException $error) {
            return response()->json([
                'message' => $error->getMessage(),
            ], 409);
        }

        return response()->json([
            'message' => 'Đã xử lý hủy chiến dịch.',
            'data' => $result,
        ]);
    }

}
