<?php

namespace App\Services\Social;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class TopupPromotionService
{
    public function isScheduled(
        object $promotion,
        CarbonImmutable $at
    ): bool {
        if (!(bool) $promotion->is_enabled) {
            return false;
        }

        $local = $at->setTimezone(
            $promotion->timezone ?: 'Asia/Ho_Chi_Minh'
        );

        $date = $local->toDateString();
        $mode = $promotion->mode;

        if ($mode === 'recurring') {
            $weekdays = $this->decode($promotion->weekdays);
            $monthDays = $this->decode($promotion->month_days);

            return in_array($local->dayOfWeekIso, $weekdays)
                || in_array($local->day, $monthDays);
        }

        if ($mode === 'specific_dates') {
            $dates = $this->decode($promotion->specific_dates);

            $inDates = in_array($date, $dates);

            $inRange = $promotion->start_date
                && $promotion->end_date
                && $date >= $promotion->start_date
                && $date <= $promotion->end_date;

            return $inDates || $inRange;
        }

        if ($mode === 'time_window') {
            if (!$promotion->start_date
                || !$promotion->end_date
                || !$promotion->start_time
                || !$promotion->end_time) {
                return false;
            }

            $time = $local->format('H:i:s');

            return $date >= $promotion->start_date
                && $date <= $promotion->end_date
                && $time >= $promotion->start_time
                && $time <= $promotion->end_time;
        }

        return false;
    }

    public function calculateBonus(
        object $promotion,
        float $amount
    ): float {
        if ($amount <= 0
            || $amount < (float) $promotion->min_topup) {
            return 0;
        }

        $bonus = $amount
            * (float) $promotion->bonus_percent / 100;

        if ($promotion->max_bonus !== null) {
            $bonus = min(
                $bonus,
                (float) $promotion->max_bonus
            );
        }

        // VND: chi tra thuong theo don vi dong.
        return round(max(0, $bonus), 0, PHP_ROUND_HALF_UP);
    }

    public function bestFor(
        int $userId,
        float $amount,
        ?CarbonImmutable $at = null
    ): ?array {
        $at ??= CarbonImmutable::now('UTC');

        $promotions = DB::table('topup_promotions')
            ->where('is_enabled', true)
            ->orderBy('id')
            ->get();

        $best = null;

        foreach ($promotions as $promotion) {
            if (!$this->isScheduled($promotion, $at)) {
                continue;
            }

            $bonus = $this->calculateBonus(
                $promotion,
                $amount
            );

            if ($bonus <= 0) {
                continue;
            }

            $usage = DB::table('topup_promotion_awards')
                ->where(
                    'topup_promotion_id',
                    $promotion->id
                );

            if ($promotion->max_total_uses !== null
                && (clone $usage)->count()
                    >= $promotion->max_total_uses) {
                continue;
            }

            if ($promotion->max_uses_per_user !== null
                && (clone $usage)
                    ->where('user_id', $userId)
                    ->count()
                    >= $promotion->max_uses_per_user) {
                continue;
            }

            if ($best === null
                || $bonus > $best['bonus_amount']) {
                $best = [
                    'promotion_id' => $promotion->id,
                    'bonus_amount' => $bonus,
                    'bonus_percent' =>
                        (float) $promotion->bonus_percent,
                ];
            }
        }

        return $best;
    }

    private function decode(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode(
            $value ?: '[]',
            true
        );

        return is_array($decoded) ? $decoded : [];
    }
}
