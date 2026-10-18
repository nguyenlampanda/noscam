<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Exchange\ExchangeCampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ExchangeCampaignController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $baseQuery = \App\Models\ExchangeCampaign::query()
            ->where('user_id', $userId);

        $pendingCounts = \App\Models\ExchangeTaskClaim::query()
            ->join(
                'exchange_campaigns',
                'exchange_campaigns.id',
                '=',
                'exchange_task_claims.campaign_id'
            )
            ->where('exchange_campaigns.user_id', $userId)
            ->where('exchange_task_claims.status', 'submitted')
            ->selectRaw(
                'COUNT(*) as pending_review_total, ' .
                'COUNT(DISTINCT exchange_campaigns.id) as campaigns_pending_total'
            )
            ->first();

        $campaigns = $baseQuery
            ->withCount([
                'claims as pending_review_count' => function ($query) {
                    $query->where('status', 'submitted');
                },
                'claims as settled_count' => function ($query) {
                    $query->where('status', 'settled');
                },
            ])
            ->orderByDesc('pending_review_count')
            ->orderByDesc('id')
            ->paginate(15);

        $campaigns->getCollection()->transform(
            fn (\App\Models\ExchangeCampaign $campaign) =>
                $this->campaignData($campaign)
        );

        return response()->json(
            array_merge($campaigns->toArray(), [
                'pending_review_total' => (int) (
                    $pendingCounts->pending_review_total ?? 0
                ),
                'campaigns_pending_total' => (int) (
                    $pendingCounts->campaigns_pending_total ?? 0
                ),
            ])
        );
    }

    public function lookupByRequest(
        Request $request,
        string $key
    ): JsonResponse {
        $campaign = \App\Models\ExchangeCampaign::query()
            ->where('user_id', $request->user()->id)
            ->where('idempotency_key', $key)
            ->first();

        if (!$campaign) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'Chưa tìm thấy chiến dịch cho mã yêu cầu.',
            ], 404);
        }

        return response()->json([
            'status' => 'created',
            'data' => $this->campaignData($campaign),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $campaign = \App\Models\ExchangeCampaign::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->firstOrFail();

        return response()->json([
            'data' => $this->campaignData($campaign),
        ]);
    }

    public function claims(Request $request, int $id): JsonResponse
    {
        $campaign = \App\Models\ExchangeCampaign::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->firstOrFail();

        $data = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'status' => ['sometimes', 'string', 'max:40'],
            'search' => ['sometimes', 'string', 'max:100'],
        ]);

        $perPage = (int) ($data['per_page'] ?? 20);
        $status = trim($data['status'] ?? '');
        $search = trim($data['search'] ?? '');

        $query = $campaign->claims();

        if ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where(
                    'submitted_username',
                    'like',
                    '%' . $search . '%'
                );

                if (ctype_digit($search)) {
                    $builder->orWhere('id', (int) $search);
                }
            });
        }

        $claims = $query
            ->orderByDesc('id')
            ->paginate($perPage);

        $claims->getCollection()->transform(
            static function (\App\Models\ExchangeTaskClaim $claim): array {
                return [
                    'id' => $claim->id,
                    'campaign_id' => $claim->campaign_id,
                    'social_username' => $claim->submitted_username,
                    'social_profile_url' => $claim->submitted_profile_url,
                    'status' => $claim->status,
                    'claimed_at' => $claim->claimed_at,
                    'submitted_at' => $claim->submitted_at,
                    'review_deadline_at' => $claim->review_deadline_at,
                    'rejected_at' => $claim->rejected_at,
                    'appeal_deadline_at' => $claim->appeal_deadline_at,
                    'settled_at' => $claim->settled_at,
                    'rejection_reason' => $claim->rejection_reason,
                    'risk_hold' => (bool) $claim->risk_hold,
                ];
            }
        );

        $stats = $campaign->claims()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($value) => (int) $value)
            ->all();

        $response = $claims->toArray();

        $response['stats'] = [
            'total' => array_sum($stats),
            'by_status' => $stats,
        ];

        return response()->json($response);
    }

    private function campaignData(
        \App\Models\ExchangeCampaign $campaign
    ): array {
        return [
            'id' => $campaign->id,
            'platform' => $campaign->platform,
            'task_type' => $campaign->task_type,
            'target_url' => $campaign->target_url,
            'quantity' => $campaign->quantity,
            'pending_review_count' => (int) (
                $campaign->pending_review_count ?? 0
            ),
            'settled_count' => (int) (
                $campaign->settled_count ?? 0
            ),
            'cost_per_task' => (int) $campaign->cost_per_task,
            'reward_per_task' => (int) $campaign->reward_per_task,
            'budget_total' => (int) $campaign->budget_total,
            'budget_held' => (int) $campaign->budget_held,
            'budget_settled' => (int) $campaign->budget_settled,
            'budget_refunded' => (int) $campaign->budget_refunded,
            'status' => $campaign->status,
            'rules_accepted' => $campaign->rules_accepted,
            'created_at' => $campaign->created_at,
            'currency' => 'VND',
        ];
    }

    public function store(
        Request $request,
        ExchangeCampaignService $service
    ): JsonResponse {
        $data = $request->validate([
            'platform' => [
                'required',
                Rule::in(['instagram', 'tiktok', 'facebook']),
            ],
            'task_type' => [
                'required',
                Rule::in(['follow', 'like', 'comment']),
            ],
            'target_url' => [
                'required',
                'string',
                'max:2048',
                'url:http,https',
            ],
            'quantity' => [
                'required',
                'integer',
                'min:1',
                'max:100000',
            ],
            'rules_accepted' => [
                'required',
                'accepted',
            ],
            'max_budget' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                'max:99999999999999',
            ],
        ]);

        $idempotencyKey = $request->header('Idempotency-Key');

        if (!is_string($idempotencyKey) || !preg_match(
            '/^[A-Za-z0-9_-]{16,128}$/',
            $idempotencyKey
        )) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Mã yêu cầu không hợp lệ.',
            ]);
        }

        try {
            $campaign = $service->create(
                $request->user(),
                $data['platform'],
                $data['task_type'],
                $data['target_url'],
                (int) $data['quantity'],
                true,
                $idempotencyKey,
                isset($data['max_budget'])
                    ? (int) $data['max_budget']
                    : null
            );
        } catch (HttpResponseException $exception) {
            throw $exception;
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'campaign' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'message' => 'Đã tạo chiến dịch và giữ ngân sách.',
            'data' => [
                'id' => $campaign->id,
                'platform' => $campaign->platform,
                'task_type' => $campaign->task_type,
                'target_url' => $campaign->target_url,
                'quantity' => $campaign->quantity,
                'cost_per_task' => (int) $campaign->cost_per_task,
                'reward_per_task' => (int) $campaign->reward_per_task,
                'budget_total' => (int) $campaign->budget_total,
                'budget_held' => (int) $campaign->budget_held,
                'status' => $campaign->status,
                'currency' => 'VND',
            ],
        ], 201);
    }
}
