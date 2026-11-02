<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Free Exchange: verified contributions are transferable, never paired. */
class ExchangeReciprocalController extends Controller
{

    // NOSCAM_RECIPROCAL_HISTORY_V1
    private function reciprocalTargetKey(
        string $platform,
        string $type,
        string $url
    ): string {
        $url = trim($url);
        $parts = parse_url($url);

        if (!is_array($parts) || empty($parts['host'])) {
            return strtolower($platform . '|' . $type . '|' . $url);
        }

        $host = strtolower($parts['host']);
        $host = preg_replace('/^www\./', '', $host);
        $path = rawurldecode($parts['path'] ?? '');
        $path = preg_replace('#/+#', '/', $path);
        $path = strtolower(rtrim($path, '/'));

        return strtolower($platform . '|' . $type . '|' . $host . $path);
    }

    private function performedTargetKeys(int $userId): array
    {
        $result = [];

        $claims = ExchangeTaskClaim::query()
            ->where('worker_user_id', $userId)
            ->whereHas('campaign', fn ($q) =>
                $q->where('is_free_reciprocal', true))
            ->with('campaign')
            ->get();

        foreach ($claims as $claim) {
            if (!$claim->campaign) {
                continue;
            }

            $accountId = (int) $claim->social_account_id;
            $key = $this->reciprocalTargetKey(
                $claim->campaign->platform,
                $claim->campaign->task_type,
                $claim->campaign->target_url
            );

            $result[$accountId][$key] = true;
        }

        return $result;
    }

    private function eligibleClaims()
    {
        // Legacy paired claims are deliberately excluded pending manual reconciliation.
        return ExchangeTaskClaim::query()->whereNull('exchange_task_claims.reciprocal_social_account_id')
            ->where('exchange_task_claims.reciprocal_status', 'confirmed')
            ->where('exchange_task_claims.status', 'approved')
            ->where('exchange_task_claims.risk_hold', false)
            ->whereHas('campaign', fn ($q) => $q->where('is_free_reciprocal', true));
    }

    public function index(Request $request)
    {
        $userId = (int) $request->user()->id;
        // Aggregate only this user's confirmed work and received interactions.
        // Unreviewed, rejected, held and old paired records never earn credit.
        $received = $this->eligibleClaims()
            ->join('exchange_campaigns as ec', 'ec.id', '=', 'exchange_task_claims.campaign_id')
            ->where('ec.user_id', $userId)
            ->selectRaw('ec.platform, ec.task_type, COUNT(*) as total')
            ->groupBy('ec.platform', 'ec.task_type')->get();
        $performed = $this->eligibleClaims()
            ->join('exchange_campaigns as ec', 'ec.id', '=', 'exchange_task_claims.campaign_id')
            ->where('exchange_task_claims.worker_user_id', $userId)
            ->selectRaw('ec.platform, ec.task_type, COUNT(*) as total')
            ->groupBy('ec.platform', 'ec.task_type')->get();
        $balances = [];
        foreach (['facebook', 'instagram', 'tiktok'] as $platform) {
            foreach (['follow', 'like', 'comment'] as $type) {
                $key = $platform . ':' . $type;
                $balances[$key] = ['platform' => $platform, 'task_type' => $type,
                    'received' => 0, 'performed' => 0, 'owed' => 0, 'available_to_receive' => 0];
            }
        }
        foreach ($received as $item) {
            $balances[$item->platform . ':' . $item->task_type]['received'] = (int) $item->total;
        }
        foreach ($performed as $item) {
            $balances[$item->platform . ':' . $item->task_type]['performed'] = (int) $item->total;
        }
        foreach ($balances as &$balance) {
            $difference = $balance['received'] - $balance['performed'];
            $balance['owed'] = max(0, $difference);
            $balance['available_to_receive'] = max(0, -$difference);
        }
        unset($balance);

        $performedKeys = $this->performedTargetKeys($userId);

        $performAccounts = ExchangeSocialAccount::query()
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->where('can_perform', true)
            ->get()
            ->groupBy('platform');

        $available = ExchangeCampaign::query()->where('is_free_reciprocal', true)
            ->where('status', 'active')->where('user_id', '!=', $userId)
            ->withCount(['claims as occupied_claims_count' => fn ($q) =>
                $q->where('status', '!=', 'rejected')])
            ->orderByDesc('id')->limit(100)->get()
            ->filter(function ($c) use ($performedKeys, $performAccounts) {
                if ($c->occupied_claims_count >= $c->quantity) {
                    return false;
                }

                $key = $this->reciprocalTargetKey(
                    $c->platform, $c->task_type, $c->target_url
                );

                foreach ($performAccounts->get($c->platform, collect()) as $account) {
                    if (!isset($performedKeys[(int) $account->id][$key])) {
                        return true;
                    }
                }

                return false;
            })
            ->map(function ($c) use ($userId, $performedKeys) {
                $targetKey = $this->reciprocalTargetKey(
                    $c->platform, $c->task_type, $c->target_url
                );

                $usedAccountIds = collect($performedKeys)
                    ->filter(fn ($keys) => isset($keys[$targetKey]))
                    ->keys()
                    ->map(fn ($id) => (int) $id)
                    ->values();

                return [
                    'id' => $c->id,
                    'platform' => $c->platform,
                    'task_type' => $c->task_type,
                    'target_url' => $c->target_url,
                    'quantity' => (int) $c->quantity,
                    'completed' => (int) $c->occupied_claims_count,
                    'used_account_ids' => $usedAccountIds,
                ];
            })
            ->values();
        $pending = ExchangeTaskClaim::query()->whereNull('reciprocal_social_account_id')
            ->where('reciprocal_status', 'pending_review')
            ->whereHas('campaign', fn ($q) => $q->where('is_free_reciprocal', true)
                ->where('user_id', $userId))
            ->with('campaign')->orderByDesc('id')->limit(100)->get()
            ->map(fn ($c) => ['id' => $c->id, 'campaign_id' => $c->campaign_id,
                'platform' => $c->campaign->platform, 'task_type' => $c->campaign->task_type,
                'username' => $c->submitted_username, 'profile_url' => $c->submitted_profile_url,
                'target_url' => $c->campaign->target_url])->values();
        $campaigns = ExchangeCampaign::query()->where('is_free_reciprocal', true)
            ->where('user_id', $userId)->withCount('claims')
            ->orderByDesc('id')->limit(100)->get()
            ->map(fn ($c) => ['id' => $c->id, 'platform' => $c->platform,
                'task_type' => $c->task_type, 'target_url' => $c->target_url,
                'quantity' => (int) $c->quantity, 'completed' => (int) $c->claims_count,
                'status' => $c->status, 'social_account_id' => $c->social_account_id,
                'reserved' => ExchangeTaskClaim::query()->where('return_campaign_id', $c->id)->where('reciprocal_status', 'pending_review')->count()])->values();

        $history = ExchangeTaskClaim::query()
            ->where('worker_user_id', $userId)
            ->whereHas('campaign', fn ($q) =>
                $q->where('is_free_reciprocal', true))
            ->with('campaign')
            ->orderByDesc('id')
            ->limit(500)
            ->get()
            ->map(fn ($claim) => [
                'id' => $claim->id,
                'campaign_id' => $claim->campaign_id,
                'social_account_id' => $claim->social_account_id,
                'platform' => $claim->campaign->platform,
                'task_type' => $claim->campaign->task_type,
                'target_url' => $claim->campaign->target_url,
                'username' => $claim->submitted_username,
                'profile_url' => $claim->submitted_profile_url,
                'status' => $claim->status,
                'reciprocal_status' => $claim->reciprocal_status,
                'return_username' => $claim->return_username,
                'return_profile_url' => $claim->return_profile_url,
                'reciprocal_confirmed_at' => $claim->reciprocal_confirmed_at,
                'submitted_at' => $claim->submitted_at,
                'created_at' => $claim->created_at,
            ])->values();

        return response()->json(['data' => ['available' => $available,
            'returns' => $pending, 'campaigns' => $campaigns,
            'history' => $history,
            'balances' => array_values($balances)]]);
    }

    public function campaignReciprocalUsers(Request $request, int $campaignId)
    {
        $campaign = ExchangeCampaign::query()->whereKey($campaignId)
            ->where('user_id', $request->user()->id)
            ->where('is_free_reciprocal', true)->firstOrFail();
        $claims = ExchangeTaskClaim::query()->where('campaign_id', $campaign->id)
            ->whereNull('reciprocal_social_account_id')->orderByDesc('id')
            ->paginate(min(50, max(1, (int) $request->input('per_page', 20))));
        return response()->json(['data' => $claims]);
    }

    public function tick(Request $request, int $campaignId)
    {
        $data = $request->validate(['perform_account_ids' => ['required', 'array', 'min:1', 'max:20'],
            'perform_account_ids.*' => ['required', 'integer','min:1'],
            'return_allocations' => ['required', 'array', 'min:1', 'max:20'],
            'return_allocations.*.account_id' => ['required', 'integer', 'min:1', 'distinct'],
            'return_allocations.*.quantity' => ['required', 'integer', 'min:1', 'max:20']]);
        $ids = array_map('intval', $data['perform_account_ids']);
        if (count(array_unique($ids)) !== count($ids)) {
            throw ValidationException::withMessages(['interaction' => 'Tài khoản bị trùng.']);
        }
        $allocations = $data['return_allocations'];
        if (array_sum(array_column($allocations, 'quantity')) !== count($ids)) {
            throw ValidationException::withMessages(['return_allocations' => 'Tổng phân bổ phải bằng số lượt gửi.']);
        }
        return DB::transaction(function () use ($request, $campaignId, $ids, $allocations) {
            $campaign = ExchangeCampaign::query()->whereKey($campaignId)
                ->lockForUpdate()->firstOrFail();
            if (!$campaign->is_free_reciprocal || $campaign->status !== 'active'
                || (int) $campaign->user_id === (int) $request->user()->id) {
                throw ValidationException::withMessages(['interaction' => 'Chiến dịch không hợp lệ.']);
            }

            $targetKey = $this->reciprocalTargetKey(
                $campaign->platform,
                $campaign->task_type,
                $campaign->target_url
            );

            // NOSCAM_RECIPROCAL_ACCOUNT_LOCK_V1
            // Lock performing accounts before checking cross-campaign history.
            // Sorting makes concurrent requests acquire account locks consistently.
            $accounts = ExchangeSocialAccount::query()
                ->where('user_id', $request->user()->id)
                ->where('platform', $campaign->platform)
                ->where('is_active', true)
                ->where('can_perform', true)
                ->whereIn('id', $ids)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($accounts->count() !== count($ids)) {
                throw ValidationException::withMessages([
                    'interaction' => 'Tài khoản đi tương tác không hợp lệ.'
                ]);
            }

            // This check must run AFTER account locks have been acquired.
            $existingKeys = $this->performedTargetKeys(
                (int) $request->user()->id
            );

            foreach ($ids as $accountId) {
                if (isset($existingKeys[(int) $accountId][$targetKey])) {
                    throw ValidationException::withMessages([
                        'interaction' =>
                            'Một tài khoản đã tương tác với link này trước đó.'
                    ]);
                }
            }
            if ($accounts->count() !== count($ids)) {
                throw ValidationException::withMessages(['interaction' => 'Tài khoản đi tương tác không hợp lệ.']);
            }
            foreach ($ids as $id) {
                $account = $accounts->get($id);
                if (!trim((string) $account->username) || !trim((string) $account->profile_url)) {
                    throw ValidationException::withMessages(['interaction' => 'Thiếu hồ sơ tài khoản.']);
                }
            }
            if (ExchangeTaskClaim::query()->where('campaign_id', $campaignId)
                ->whereIn('social_account_id', $ids)->exists()) {
                throw ValidationException::withMessages(['interaction' => 'Đã gửi tương tác bằng tài khoản này.']);
            }
            // NOSCAM_EXCHANGE_SAFETY_V1: rejected claims do not occupy slots.
            if (ExchangeTaskClaim::query()->where('campaign_id', $campaignId)
                ->where('status', '!=', 'rejected')->count()
                + count($ids) > (int) $campaign->quantity) {
                throw ValidationException::withMessages(['interaction' => 'Chiến dịch không đủ lượt.']);
            }
            // Auto-receive: each allocation points to an owned enabled receiving account.
            // Campaigns start with zero slots and only gain slots after approval.
            $assignedCampaignIds = [];
            $targets = collect($allocations)->sortBy('account_id')->values();
            foreach ($targets as $entry) {
                $receiveAccount = ExchangeSocialAccount::query()
                    ->whereKey((int) $entry['account_id'])
                    ->where('user_id', $request->user()->id)
                    ->where('platform', $campaign->platform)
                    ->where('is_active', true)->where('can_receive', true)
                    ->lockForUpdate()->first();
                if (!$receiveAccount || !trim((string) $receiveAccount->profile_url)) {
                    throw ValidationException::withMessages(['return_allocations' => 'Tài khoản nhận không hợp lệ.']);
                }
                // A profile URL is sufficient for follows. Likes/comments need a post URL,
                // which cannot safely be inferred from the account profile.
                if ($campaign->task_type !== 'follow') {
                    throw ValidationException::withMessages(['return_allocations' => 'Tự động nhận hiện chỉ hỗ trợ Theo dõi. Like/Bình luận cần liên kết bài viết.']);
                }
                $url = trim((string) $receiveAccount->profile_url);
                $parts = parse_url($url);
                $host = strtolower(rtrim($parts['host'] ?? '', '.'));
                $allowed = match ($campaign->platform) {
                    'instagram' => 'instagram.com', 'tiktok' => 'tiktok.com',
                    'facebook' => 'facebook.com', default => '',
                };
                if (($parts['scheme'] ?? '') !== 'https' || !$allowed ||
                    !($host === $allowed || str_ends_with($host, '.' . $allowed)) ||
                    isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) {
                    throw ValidationException::withMessages(['return_allocations' => 'Link hồ sơ nhận không hợp lệ.']);
                }
                // Reuse only our own auto-created campaign, never a manual campaign.
                $key = 'auto-return-' . $receiveAccount->id . '-follow';
                $target = ExchangeCampaign::query()
                    ->where('user_id', $request->user()->id)
                    ->where('idempotency_key', $key)
                    ->lockForUpdate()->first();
                if (!$target) {
                    $target = ExchangeCampaign::create([
                        'user_id' => $request->user()->id,
                        'social_account_id' => $receiveAccount->id,
                        'platform' => $campaign->platform, 'task_type' => 'follow',
                        'target_url' => $url, 'quantity' => 0,
                        'cost_per_task' => 0, 'reward_per_task' => 0,
                        'budget_total' => 0, 'budget_held' => 0,
                        'budget_settled' => 0, 'budget_refunded' => 0,
                        'status' => 'paused', 'is_free_reciprocal' => true,
                        'rules_accepted' => true, 'rules_accepted_at' => now(),
                        'idempotency_key' => $key,
                    ]);
                } elseif (!$target->is_free_reciprocal ||
                    (int) $target->social_account_id !== (int) $receiveAccount->id ||
                    $target->platform !== $campaign->platform || $target->task_type !== 'follow') {
                    throw ValidationException::withMessages(['return_allocations' => 'Chiến dịch nhận tự động không hợp lệ.']);
                }
                for ($i = 0; $i < (int) $entry['quantity']; $i++) {
                    $assignedCampaignIds[] = $target->id;
                }
            }
            foreach ($ids as $index => $id) {
                $account = $accounts->get($id);
                // NOSCAM_FREE_UNIQUE_KEY_V2
                $targetHash = hash('sha256', $targetKey);

                try {
                    DB::table('exchange_free_interaction_keys')->insert([
                        'social_account_id' => $id,
                        'target_hash' => $targetHash,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                    // NOSCAM_FREE_UNIQUE_ERROR_V3
                    // Only handle the expected account/target unique constraint.
                    if (!str_contains(
                        $e->getMessage(),
                        'exchange_free_account_target_unique'
                    )) {
                        throw $e;
                    }

                    throw ValidationException::withMessages([
                        'interaction' =>
                            'Tài khoản này đã tương tác với liên kết này trước đó. Vui lòng chọn tài khoản khác.',
                    ]);
                }

                $claim = ExchangeTaskClaim::create(['campaign_id' => $campaignId,
                    'worker_user_id' => $request->user()->id, 'social_account_id' => $id,
                    'submitted_username' => $account->username,
                    'submitted_profile_url' => $account->profile_url,
                    'status' => 'submitted', 'claimed_at' => now(), 'submitted_at' => now(),
                    'reciprocal_status' => 'pending_review', 'risk_hold' => false,
                    'return_campaign_id' => $assignedCampaignIds[$index]]);

                DB::table('exchange_free_interaction_keys')
                    ->where('social_account_id', $id)
                    ->where('target_hash', $targetHash)
                    ->update(['claim_id' => $claim->id]);
            }
            return response()->json(['message' => 'Đã gửi ' . count($ids) . ' lượt, chờ chủ chiến dịch duyệt.']);
        }, 3);
    }

    public function confirmReturn(Request $request, int $claimId)
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'return_account_id' => [
                'required_if:decision,approve',
                'nullable',
                'integer',
                'exists:exchange_social_accounts,id',
            ],
        ]);
        return DB::transaction(function () use ($request, $claimId, $data) {
            $campaignId = ExchangeTaskClaim::query()->whereKey($claimId)->value('campaign_id');
            if (!$campaignId) abort(404);
            $campaign = ExchangeCampaign::query()->whereKey($campaignId)
                ->lockForUpdate()->firstOrFail();
            if (!$campaign->is_free_reciprocal || (int) $campaign->user_id !== (int) $request->user()->id) abort(403);
            $claim = ExchangeTaskClaim::query()->whereKey($claimId)
                ->where('campaign_id', $campaignId)->lockForUpdate()->firstOrFail();
            if ($claim->reciprocal_social_account_id !== null || $claim->reciprocal_status !== 'pending_review' || $claim->status !== 'submitted') {
                throw ValidationException::withMessages(['interaction' => 'Nhiệm vụ không chờ duyệt.']);
            }
            if ($claim->risk_hold) {
                throw ValidationException::withMessages(['interaction' => 'Nhiệm vụ đang bị giữ để kiểm tra.']);
            }
            if ($data['decision'] === 'approve') {
                if (in_array($campaign->status, ['cancelled', 'canceled'], true)) {
                    throw ValidationException::withMessages([
                        'interaction' => 'Chiến dịch đã hủy, không thể duyệt.',
                    ]);
                }
                // NOSCAM_RETURN_ACCOUNT_CONFIRM_V1
                // NOSCAM_AUTO_PRIORITY_RETURN_ACCOUNT_V1
                // Priority nhỏ hơn được chọn trước.
                $returnAccount = ExchangeSocialAccount::query()
                    ->whereKey((int) $data['return_account_id'])
                    ->where('user_id', $request->user()->id)
                    ->where('platform', $campaign->platform)
                    ->where('is_active', true)
                    ->where('can_receive', true)
                    ->lockForUpdate()
                    ->first();

                if (!$returnAccount) {
                    throw ValidationException::withMessages([
                        'return_account_id' => 'Tài khoản nhận không hợp lệ.',
                    ]);
                }

                // The receiving account must be the campaign's actual target.
                // Do not record a different account as having received the work.
                $targetUrl = $this->reciprocalTargetKey(
                    $campaign->platform, $campaign->task_type,
                    (string) $campaign->target_url
                );
                $accountUrl = $this->reciprocalTargetKey(
                    $campaign->platform, $campaign->task_type,
                    (string) $returnAccount->profile_url
                );
                if ($campaign->task_type !== 'follow' ||
                    $targetUrl !== $accountUrl) {
                    throw ValidationException::withMessages([
                        'return_account_id' =>
                            'Tài khoản được chọn không trùng đối tượng nhận của chiến dịch.',
                    ]);
                }

                $claim->update([
                    'reciprocal_status' => 'confirmed',
                    'status' => 'approved',
                    'return_username' => $returnAccount->username,
                    'return_profile_url' => $returnAccount->profile_url,
                    'reciprocal_confirmed_at' => now(),
                    'finalized_at' => now(),
                ]);
                if ($claim->return_campaign_id !== null) {
                    $target = ExchangeCampaign::query()->whereKey($claim->return_campaign_id)
                        ->lockForUpdate()->firstOrFail();
                    if (!$target->is_free_reciprocal ||
                        (int) $target->user_id !== (int) $claim->worker_user_id ||
                        $target->platform !== $campaign->platform ||
                        $target->task_type !== $campaign->task_type ||
                        !str_starts_with((string) $target->idempotency_key, 'auto-return-')) {
                        throw ValidationException::withMessages(['interaction' => 'Chiến dịch nhận tự động không hợp lệ.']);
                    }
                    $receiveAccount = ExchangeSocialAccount::query()
                        ->whereKey($target->social_account_id)->first();
                    $active = $receiveAccount && $receiveAccount->is_active && $receiveAccount->can_receive;
                    $target->update([
                        'quantity' => (int) $target->quantity + 1,
                        'status' => $active ? 'active' : 'paused',
                    ]);
                }
            } else {
                $claim->update(['reciprocal_status' => 'rejected', 'status' => 'rejected',
                    'rejected_at' => now()]);
            }
            return response()->json(['message' => $data['decision'] === 'approve'
                ? 'Đã duyệt lượt hợp lệ.' : 'Đã từ chối lượt.']);
        }, 3);
    }
}
