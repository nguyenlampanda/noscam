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
            'platform' => ['sometimes', 'string', 'in:instagram,tiktok,facebook'],
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


    public function campaignClaims(
        \Illuminate\Http\Request $request,
        int $campaignId
    ): \Illuminate\Http\JsonResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $campaign = \App\Models\ExchangeCampaign::query()
            ->findOrFail($campaignId);

        $claims = \App\Models\ExchangeTaskClaim::query()
            ->where('campaign_id', $campaign->id)
            ->with([
                'worker:id,name,username',
                'socialAccount:id,username,profile_url',
            ])
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => [
                'campaign_id' => $campaign->id,
                'quantity' => (int) $campaign->quantity,
                'claims' => $claims->map(function ($claim) {
                    return [
                        'id' => $claim->id,
                        'status' => $claim->status,
                        'worker' => $claim->worker ? [
                            'id' => $claim->worker->id,
                            'name' => $claim->worker->name,
                            'username' => $claim->worker->username,
                        ] : null,
                        'account_username' =>
                            $claim->submitted_username
                            ?: $claim->socialAccount?->username,
                        'profile_url' =>
                            $claim->submitted_profile_url
                            ?: $claim->socialAccount?->profile_url,
                        'claimed_at' => $claim->claimed_at,
                        'submitted_at' => $claim->submitted_at,
                    ];
                })->values(),
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
