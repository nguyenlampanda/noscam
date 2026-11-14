<?php

namespace Tests\Unit;

use App\Services\Social\TopupPromotionService;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class TopupPromotionServiceTest extends TestCase
{
    private function promotion(array $changes = []): object
    {
        return (object) array_merge([
            'is_enabled' => true,
            'timezone' => 'Asia/Ho_Chi_Minh',
            'mode' => 'recurring',
            'weekdays' => '[1]',
            'month_days' => '[]',
            'specific_dates' => '[]',
            'start_date' => null,
            'end_date' => null,
            'start_time' => null,
            'end_time' => null,
            'min_topup' => 100000,
            'bonus_percent' => 10,
            'max_bonus' => 20000,
        ], $changes);
    }

    public function test_recurring_schedule_uses_vietnam_time(): void
    {
        $service = new TopupPromotionService();

        $at = CarbonImmutable::parse(
            '2026-11-08 18:00:00',
            'UTC'
        );

        $this->assertTrue(
            $service->isScheduled(
                $this->promotion(),
                $at
            )
        );
    }

    public function test_specific_dates_expire(): void
    {
        $service = new TopupPromotionService();

        $promotion = $this->promotion([
            'mode' => 'specific_dates',
            'specific_dates' => '["2026-11-09"]',
        ]);

        $this->assertTrue(
            $service->isScheduled(
                $promotion,
                CarbonImmutable::parse(
                    '2026-11-09 12:00:00',
                    'Asia/Ho_Chi_Minh'
                )
            )
        );

        $this->assertFalse(
            $service->isScheduled(
                $promotion,
                CarbonImmutable::parse(
                    '2026-11-10 12:00:00',
                    'Asia/Ho_Chi_Minh'
                )
            )
        );
    }

    public function test_time_window(): void
    {
        $service = new TopupPromotionService();

        $promotion = $this->promotion([
            'mode' => 'time_window',
            'start_date' => '2026-11-09',
            'end_date' => '2026-11-09',
            'start_time' => '19:00:00',
            'end_time' => '23:00:00',
        ]);

        $this->assertTrue(
            $service->isScheduled(
                $promotion,
                CarbonImmutable::parse(
                    '2026-11-09 20:00:00',
                    'Asia/Ho_Chi_Minh'
                )
            )
        );

        $this->assertFalse(
            $service->isScheduled(
                $promotion,
                CarbonImmutable::parse(
                    '2026-11-09 23:30:00',
                    'Asia/Ho_Chi_Minh'
                )
            )
        );
    }

    public function test_bonus_respects_cap_and_minimum(): void
    {
        $service = new TopupPromotionService();
        $promotion = $this->promotion();

        $this->assertSame(
            0.0,
            $service->calculateBonus($promotion, 50000)
        );

        $this->assertSame(
            15000.0,
            $service->calculateBonus($promotion, 150000)
        );

        $this->assertSame(
            20000.0,
            $service->calculateBonus($promotion, 500000)
        );
    }
}
