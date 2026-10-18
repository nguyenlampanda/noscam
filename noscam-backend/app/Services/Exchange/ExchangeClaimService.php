<?php

namespace App\Services\Exchange;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ExchangeClaimService
{




    public function appeal(
        int $claimId,
        User $worker,
        string $reason
    ): ExchangeTaskClaim {
        return DB::transaction(function () use (
            $claimId,
            $worker,
            $reason
        ) {
            // Khóa campaign trước, sau đó khóa claim.
            $campaignId = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->value('campaign_id');

            if ($campaignId === null) {
                throw new RuntimeException(
                    'Không tìm thấy nhiệm vụ.'
                );
            }

            $campaign = ExchangeCampaign::query()
                ->whereKey($campaignId)
                ->lockForUpdate()
                ->firstOrFail();

            $claim = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->where('campaign_id', $campaign->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $claim->worker_user_id !== (int) $worker->id) {
                throw new RuntimeException(
                    'Bạn không có quyền khiếu nại nhiệm vụ này.'
                );
            }

            if (!in_array($campaign->status, ['active', 'paused', 'cancelling'], true)) {
                throw new RuntimeException(
                    'Chiến dịch không còn hoạt động.'
                );
            }

            $reason = trim($reason);

            if ($reason === '' || mb_strlen($reason) > 2000) {
                throw new RuntimeException(
                    'Lý do khiếu nại phải có từ 1 đến 2000 ký tự.'
                );
            }

            if (!ExchangeClaimRules::canAppeal(
                $claim->status,
                $claim->appeal_deadline_at,
                now()
            )) {
                throw new RuntimeException(
                    'Nhiệm vụ không còn trong thời hạn khiếu nại.'
                );
            }

            if ($claim->risk_hold) {
                throw new RuntimeException(
                    'Nhiệm vụ đang được kiểm tra rủi ro.'
                );
            }

            if ($claim->dispute()->exists()) {
                throw new RuntimeException(
                    'Nhiệm vụ đã có hồ sơ khiếu nại.'
                );
            }

            \App\Models\ExchangeTaskDispute::create([
                'claim_id' => $claim->id,
                'opened_by' => $worker->id,
                'status' => 'pending',
                'appeal_reason' => $reason,
                'evidence' => [],
            ]);

            $claim->update([
                'status' => ExchangeClaimStatus::DISPUTED,
            ]);

            // Không chuyển hoặc hoàn xu tại đây.
            // Ngân sách tiếp tục được giữ chờ admin phân xử.

            return $claim->refresh();
        }, 3);
    }

    public function reject(
        int $claimId,
        User $owner,
        string $reason
    ): ExchangeTaskClaim {
        return DB::transaction(function () use (
            $claimId,
            $owner,
            $reason
        ) {
            // Khóa campaign trước, sau đó khóa claim.
            $campaignId = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->value('campaign_id');

            if ($campaignId === null) {
                throw new RuntimeException(
                    'Không tìm thấy nhiệm vụ.'
                );
            }

            $campaign = ExchangeCampaign::query()
                ->whereKey($campaignId)
                ->lockForUpdate()
                ->firstOrFail();

            $claim = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->where('campaign_id', $campaign->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $campaign->user_id !== (int) $owner->id) {
                throw new RuntimeException(
                    'Bạn không có quyền từ chối nhiệm vụ này.'
                );
            }

            if (!in_array($campaign->status, ['active', 'paused', 'cancelling'], true)) {
                throw new RuntimeException(
                    'Chiến dịch không còn hoạt động.'
                );
            }

            $reason = trim($reason);

            if ($reason === '' || mb_strlen($reason) > 2000) {
                throw new RuntimeException(
                    'Lý do từ chối phải có từ 1 đến 2000 ký tự.'
                );
            }

            if (!ExchangeClaimRules::canOwnerReview(
                $claim->status,
                $claim->review_deadline_at,
                now()
            )) {
                throw new RuntimeException(
                    'Nhiệm vụ không còn trong thời hạn duyệt.'
                );
            }

            if ($claim->risk_hold) {
                throw new RuntimeException(
                    'Nhiệm vụ đang được kiểm tra rủi ro.'
                );
            }

            if ($claim->dispute()->exists()) {
                throw new RuntimeException(
                    'Nhiệm vụ đã có hồ sơ tranh chấp.'
                );
            }

            $rejectedAt = now();

            $claim->update([
                'status' => ExchangeClaimStatus::REJECTED,
                'rejection_reason' => $reason,
                'rejected_at' => $rejectedAt,
                'appeal_deadline_at' => $rejectedAt
                    ->copy()
                    ->addHours(48),
            ]);

            // Không hoàn tiền tại đây.
            // Ngân sách tiếp tục được giữ trong thời gian khiếu nại.

            return $claim->refresh();
        }, 3);
    }

    public function approve(
        int $claimId,
        User $owner
    ): ExchangeTaskClaim {
        return DB::transaction(function () use ($claimId, $owner) {
            // Đọc ID trước, sau đó khóa campaign rồi claim.
            // Cùng thứ tự khóa với ExchangeEscrowService.
            $campaignId = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->value('campaign_id');

            if ($campaignId === null) {
                throw new RuntimeException(
                    'Không tìm thấy nhiệm vụ.'
                );
            }

            $campaign = ExchangeCampaign::query()
                ->whereKey($campaignId)
                ->lockForUpdate()
                ->firstOrFail();

            $claim = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->where('campaign_id', $campaign->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $campaign->user_id !== (int) $owner->id) {
                throw new RuntimeException(
                    'Bạn không có quyền duyệt nhiệm vụ này.'
                );
            }

            if (!in_array($campaign->status, ['active', 'paused', 'cancelling'], true)) {
                throw new RuntimeException(
                    'Chiến dịch không còn hoạt động.'
                );
            }

            if (!ExchangeClaimRules::canOwnerReview(
                $claim->status,
                $claim->review_deadline_at,
                now()
            )) {
                throw new RuntimeException(
                    'Nhiệm vụ không còn trong thời hạn duyệt.'
                );
            }

            if ($claim->risk_hold) {
                throw new RuntimeException(
                    'Nhiệm vụ đang được kiểm tra rủi ro.'
                );
            }

            if ($claim->dispute()->exists()) {
                throw new RuntimeException(
                    'Nhiệm vụ đang có hồ sơ khiếu nại.'
                );
            }

            // EscrowService sử dụng cùng transaction, tự khóa lại
            // bản ghi và kiểm tra idempotency trước khi trả xu.
            app(ExchangeEscrowService::class)
                ->settleClaim($claim);

            return $claim->refresh();
        }, 3);
    }

    public function submit(
        int $claimId,
        User $worker
    ): ExchangeTaskClaim {
        return DB::transaction(function () use ($claimId, $worker) {
            // Khóa chiến dịch trước, sau đó khóa nhiệm vụ.
            $campaignId = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->value('campaign_id');

            if ($campaignId === null) {
                throw new RuntimeException(
                    'Không tìm thấy nhiệm vụ.'
                );
            }

            $campaign = ExchangeCampaign::query()
                ->whereKey($campaignId)
                ->lockForUpdate()
                ->firstOrFail();

            $claim = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->where('campaign_id', $campaign->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $claim->worker_user_id !== (int) $worker->id) {
                throw new RuntimeException(
                    'Bạn không có quyền nộp nhiệm vụ này.'
                );
            }

            if (!in_array($campaign->status, ['active', 'paused', 'cancelling'], true)) {
                throw new RuntimeException(
                    'Chiến dịch không còn hoạt động.'
                );
            }

            if ($claim->status !== ExchangeClaimStatus::CLAIMED) {
                throw new RuntimeException(
                    'Nhiệm vụ không ở trạng thái có thể nộp.'
                );
            }

            $account = ExchangeSocialAccount::query()
                ->whereKey($claim->social_account_id)
                ->where('user_id', $worker->id)
                ->where('platform', $campaign->platform)
                ->where('is_active', true)
                ->first();

            if (!$account) {
                throw new RuntimeException(
                    'Tài khoản mạng xã hội không hợp lệ.'
                );
            }

            if (
                !is_string($account->username)
                || trim($account->username) === ''
                || !is_string($account->profile_url)
                || trim($account->profile_url) === ''
            ) {
                throw new RuntimeException(
                    'Thông tin tài khoản mạng xã hội chưa đầy đủ.'
                );
            }

            $submittedAt = now();

            $claim->update([
                'status' => ExchangeClaimStatus::SUBMITTED,
                'submitted_username' => $account->username,
                'submitted_profile_url' => $account->profile_url,
                'submitted_at' => $submittedAt,
                'review_deadline_at' => $submittedAt->copy()->addHours(48),
            ]);

            return $claim->refresh();
        }, 3);
    }

    public function claim(
        int $campaignId,
        User $worker,
        int $socialAccountId
    ): ExchangeTaskClaim {
        return DB::transaction(function () use (
            $campaignId,
            $worker,
            $socialAccountId
        ) {
            // Khóa chiến dịch để tránh nhận vượt số lượng.
            $campaign = ExchangeCampaign::query()
                ->whereKey($campaignId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($campaign->status !== 'active') {
                throw new RuntimeException(
                    'Chiến dịch không hoạt động.'
                );
            }

            // Bảo vệ ngân sách đã ký quỹ.
            $quantity = (int) $campaign->quantity;

            $values = [
                'cost' => $campaign->cost_per_task,
                'reward' => $campaign->reward_per_task,
                'total' => $campaign->budget_total,
                'held' => $campaign->budget_held,
                'settled' => $campaign->budget_settled,
                'refunded' => $campaign->budget_refunded,
            ];

            foreach ($values as $name => $value) {
                $text = (string) $value;

                if (!preg_match('/^[0-9]+(?:\.0{1,4})?$/', $text)) {
                    throw new RuntimeException(
                        'Ngân sách Exchange chứa số xu không hợp lệ.'
                    );
                }

                $integer = explode('.', $text, 2)[0];

                if (strlen($integer) > 14) {
                    throw new RuntimeException(
                        'Ngân sách Exchange vượt giới hạn.'
                    );
                }

                $values[$name] = (int) $integer;
            }

            if (
                $quantity <= 0
                || $values['cost'] <= 0
                || $values['reward'] <= 0
                || $values['reward'] > $values['cost']
                || $quantity * $values['cost'] !== $values['total']
                || $values['held']
                    + $values['settled']
                    + $values['refunded'] !== $values['total']
                || $values['held'] < $values['cost']
            ) {
                throw new RuntimeException(
                    'Ngân sách chiến dịch không nhất quán.'
                );
            }

            if ((int) $campaign->user_id === (int) $worker->id) {
                throw new RuntimeException(
                    'Không thể nhận nhiệm vụ của chính mình.'
                );
            }

            $account = ExchangeSocialAccount::query()
                ->whereKey($socialAccountId)
                ->where('user_id', $worker->id)
                ->where('is_active', true)
                ->first();

            if (!$account) {
                throw new RuntimeException(
                    'Tài khoản mạng xã hội không hợp lệ.'
                );
            }

            if ($account->platform !== $campaign->platform) {
                throw new RuntimeException(
                    'Nền tảng tài khoản không khớp chiến dịch.'
                );
            }

            $alreadyClaimed = ExchangeTaskClaim::query()
                ->where('campaign_id', $campaign->id)
                ->where('social_account_id', $account->id)
                ->exists();

            if ($alreadyClaimed) {
                throw new RuntimeException(
                    'Tài khoản mạng xã hội này đã nhận nhiệm vụ.'
                );
            }

            $claimedCount = ExchangeTaskClaim::query()
                ->where('campaign_id', $campaign->id)
                ->count();

            if ($claimedCount >= (int) $campaign->quantity) {
                throw new RuntimeException(
                    'Chiến dịch đã đủ số lượng nhiệm vụ.'
                );
            }

            // Giữ đủ ngân sách cho mọi claim chưa hoàn tất.
            $pendingCount = ExchangeTaskClaim::query()
                ->where('campaign_id', $campaign->id)
                ->whereIn('status', [
                    ExchangeClaimStatus::CLAIMED,
                    ExchangeClaimStatus::SUBMITTED,
                    ExchangeClaimStatus::REJECTED,
                    ExchangeClaimStatus::DISPUTED,
                ])
                ->count();

            $requiredBudget =
                ($pendingCount + 1) * $values['cost'];

            if ($values['held'] < $requiredBudget) {
                throw new RuntimeException(
                    'Ngân sách còn lại đã được cam kết cho nhiệm vụ khác.'
                );
            }

            return ExchangeTaskClaim::create([
                'campaign_id' => $campaign->id,
                'worker_user_id' => $worker->id,
                'social_account_id' => $account->id,
                'submitted_username' => null,
                'submitted_profile_url' => null,
                'status' => ExchangeClaimStatus::CLAIMED,
                'claimed_at' => now(),
                'risk_hold' => false,
            ]);
        }, 3);
    }
}
