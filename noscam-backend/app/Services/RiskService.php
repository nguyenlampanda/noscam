<?php

namespace App\Services;

use App\Models\Entity;

class RiskService
{
    public function update(
        Entity $entity
    ): Entity {
        $approvedReports =
            $entity
                ->reports()
                ->where(
                    'reports.status',
                    'approved'
                );

        $reportCount =
            (clone $approvedReports)
                ->count();

        $firstDetectedAt =
            (clone $approvedReports)
                ->min(
                    'reports.created_at'
                );

        $lastReportAt =
            (clone $approvedReports)
                ->max(
                    'reports.created_at'
                );

        $score =
            $this->calculateScore(
                $reportCount
            );

        $level =
            $this->calculateLevel(
                $score
            );

        $entity->update([
            'report_count' =>
                $reportCount,

            'risk_score' =>
                $score,

            'risk_level' =>
                $level,

            'first_detected_at' =>
                $firstDetectedAt,

            'last_report_at' =>
                $lastReportAt,
        ]);

        return $entity->refresh();
    }

    private function calculateScore(
        int $reportCount
    ): int {
        return match (true) {
            $reportCount >= 10 =>
                90,

            $reportCount >= 7 =>
                80,

            $reportCount >= 5 =>
                70,

            $reportCount >= 3 =>
                60,

            $reportCount >= 2 =>
                45,

            $reportCount >= 1 =>
                30,

            default =>
                0,
        };
    }

    private function calculateLevel(
        int $score
    ): string {
        return match (true) {
            $score >= 80 =>
                'high',

            $score >= 50 =>
                'medium',

            $score >= 20 =>
                'low',

            default =>
                'safe',
        };
    }
}