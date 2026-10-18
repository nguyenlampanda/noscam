<?php

namespace App\Services\Exchange;

use Carbon\CarbonInterface;

final class ExchangeClaimRules
{
    public static function canOwnerReview(
        string $status,
        ?CarbonInterface $deadline,
        CarbonInterface $now
    ): bool {
        return $status === ExchangeClaimStatus::SUBMITTED
            && $deadline !== null
            && $now->lessThan($deadline);
    }

    public static function canAutoApprove(
        string $status,
        ?CarbonInterface $deadline,
        bool $riskHold,
        CarbonInterface $now
    ): bool {
        return $status === ExchangeClaimStatus::SUBMITTED
            && !$riskHold
            && $deadline !== null
            && $now->greaterThanOrEqualTo($deadline);
    }

    public static function canAppeal(
        string $status,
        ?CarbonInterface $deadline,
        CarbonInterface $now
    ): bool {
        return $status === ExchangeClaimStatus::REJECTED
            && $deadline !== null
            && $now->lessThan($deadline);
    }
}
