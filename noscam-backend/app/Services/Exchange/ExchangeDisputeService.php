<?php

namespace App\Services\Exchange;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeTaskClaim;
use App\Models\ExchangeTaskDispute;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ExchangeDisputeService
{
    public function resolve(
        int $disputeId,
        User $admin,
        string $decision,
        string $reason
    ): ExchangeTaskDispute {
        if (!$admin->isAdmin()) {
            throw new RuntimeException(
                'Chỉ admin được phân xử tranh chấp.'
            );
        }

        $reason = trim($reason);

        if ($reason === '' || mb_strlen($reason) > 2000) {
            throw new RuntimeException(
                'Lý do phân xử phải có từ 1 đến 2000 ký tự.'
            );
        }

        if (!in_array($decision, ['approve', 'refund'], true)) {
            throw new RuntimeException(
                'Quyết định phân xử không hợp lệ.'
            );
        }

        return DB::transaction(function () use (
            $disputeId,
            $admin,
            $decision,
            $reason
        ) {
            $snapshot = ExchangeTaskDispute::query()
                ->whereKey($disputeId)
                ->firstOrFail();

            $claimSnapshot = ExchangeTaskClaim::query()
                ->whereKey($snapshot->claim_id)
                ->firstOrFail();

            // Thống nhất thứ tự khóa:
            // campaign -> claim -> dispute.
            $campaign = ExchangeCampaign::query()
                ->whereKey($claimSnapshot->campaign_id)
                ->lockForUpdate()
                ->firstOrFail();

            $claim = ExchangeTaskClaim::query()
                ->whereKey($claimSnapshot->id)
                ->lockForUpdate()
                ->firstOrFail();

            $dispute = ExchangeTaskDispute::query()
                ->whereKey($disputeId)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                (int) $claim->campaign_id !== (int) $campaign->id
                || (int) $dispute->claim_id !== (int) $claim->id
            ) {
                throw new RuntimeException(
                    'Dữ liệu tranh chấp không nhất quán.'
                );
            }

            if (!in_array($campaign->status, ['active', 'paused', 'cancelling'], true)) {
                throw new RuntimeException(
                    'Chiến dịch không còn hoạt động.'
                );
            }

            if (
                $claim->status !== ExchangeClaimStatus::DISPUTED
                || $dispute->status !== 'pending'
                || $dispute->resolved_at !== null
                || $dispute->resolved_by !== null
            ) {
                throw new RuntimeException(
                    'Tranh chấp đã được xử lý hoặc không hợp lệ.'
                );
            }

            if (
                (int) $dispute->opened_by
                !== (int) $claim->worker_user_id
            ) {
                throw new RuntimeException(
                    'Người khiếu nại không hợp lệ.'
                );
            }

            if ($claim->risk_hold) {
                throw new RuntimeException(
                    'Nhiệm vụ đang được giữ để kiểm tra rủi ro.'
                );
            }

            // Chuyển xu từ ngân sách ký quỹ.
            // Giao dịch lồng nhau vẫn thuộc transaction bên ngoài.
            app(ExchangeEscrowService::class)
                ->resolveDisputedClaim($claim, $decision);

            // Chỉ đánh dấu hoàn tất sau khi xử lý ký quỹ thành công.
            $dispute->status = $decision === 'approve'
                ? 'approved'
                : 'rejected';

            $dispute->admin_reason = $reason;
            $dispute->resolved_by = $admin->id;
            $dispute->resolved_at = now();
            $dispute->save();

            return $dispute->refresh();
        }, 3);
    }
}
