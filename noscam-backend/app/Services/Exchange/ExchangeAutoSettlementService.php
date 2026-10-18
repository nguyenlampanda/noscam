<?php

namespace App\Services\Exchange;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeTaskClaim;
use Illuminate\Support\Facades\DB;

class ExchangeAutoSettlementService
{
    public function __construct(
        private readonly ExchangeEscrowService $escrow
    ) {
    }

    public function processClaim(int $claimId): ?string
    {
        return DB::transaction(function () use ($claimId) {
            // Chỉ đọc campaign_id trước khi khóa.
            $campaignId = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->value('campaign_id');

            if ($campaignId === null) {
                return null;
            }

            // Thống nhất thứ tự khóa: campaign -> claim.
            $campaign = ExchangeCampaign::query()
                ->whereKey($campaignId)
                ->lockForUpdate()
                ->first();

            if (
                !$campaign
                || !in_array($campaign->status, ['active', 'paused', 'cancelling'], true)
            ) {
                return null;
            }

            $claim = ExchangeTaskClaim::query()
                ->whereKey($claimId)
                ->lockForUpdate()
                ->first();

            if (
                !$claim
                || (int) $claim->campaign_id !== (int) $campaign->id
                || $claim->risk_hold
                || $claim->dispute()->exists()
            ) {
                return null;
            }

            // Kiểm tra thời hạn SAU khi đã khóa bản ghi.
            if (ExchangeClaimRules::canAutoApprove(
                $claim->status,
                $claim->review_deadline_at,
                (bool) $claim->risk_hold,
                now()
            )) {
                $this->escrow->settleClaim($claim);

                return 'approved';
            }

            if (
                $claim->status === 'rejected'
                && $claim->appeal_deadline_at !== null
                && now()->greaterThanOrEqualTo(
                    $claim->appeal_deadline_at
                )
            ) {
                $this->escrow->refundClaim($claim);

                return 'refunded';
            }

            return null;
        }, 3);
    }
}
