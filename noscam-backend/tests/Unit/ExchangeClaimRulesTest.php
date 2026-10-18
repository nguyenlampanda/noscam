<?php

namespace Tests\Unit;

use App\Services\Exchange\ExchangeClaimRules;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class ExchangeClaimRulesTest extends TestCase
{
    public function test_owner_can_review_before_deadline(): void
    {
        $now = CarbonImmutable::parse('2026-10-13 12:00:00');

        $this->assertTrue(
            ExchangeClaimRules::canOwnerReview(
                'submitted',
                $now->addHour(),
                $now
            )
        );
    }

    public function test_owner_cannot_review_after_deadline(): void
    {
        $now = CarbonImmutable::parse('2026-10-13 12:00:00');

        $this->assertFalse(
            ExchangeClaimRules::canOwnerReview(
                'submitted',
                $now->subSecond(),
                $now
            )
        );
    }

    public function test_auto_approval_after_deadline(): void
    {
        $now = CarbonImmutable::parse('2026-10-13 12:00:00');

        $this->assertTrue(
            ExchangeClaimRules::canAutoApprove(
                'submitted',
                $now->subSecond(),
                false,
                $now
            )
        );

        $this->assertFalse(
            ExchangeClaimRules::canAutoApprove(
                'submitted',
                $now->subSecond(),
                true,
                $now
            )
        );
    }

    public function test_worker_can_appeal_within_deadline(): void
    {
        $now = CarbonImmutable::parse('2026-10-13 12:00:00');

        $this->assertTrue(
            ExchangeClaimRules::canAppeal(
                'rejected',
                $now->addHour(),
                $now
            )
        );

        $this->assertFalse(
            ExchangeClaimRules::canAppeal(
                'rejected',
                $now->subSecond(),
                $now
            )
        );
    }

    public function test_finalized_claim_cannot_be_reviewed(): void
    {
        $now = CarbonImmutable::parse('2026-10-13 12:00:00');

        foreach (['settled', 'refunded'] as $status) {
            $this->assertFalse(
                ExchangeClaimRules::canOwnerReview(
                    $status,
                    $now->addHour(),
                    $now
                )
            );
        }
    }
}
