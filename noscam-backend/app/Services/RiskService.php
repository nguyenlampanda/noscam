<?php

namespace App\Services;

use App\Models\Entity;
use App\Models\EntityRelation;
use App\Models\Report;
use Illuminate\Support\Collection;

class RiskService
{
    public function update(
        Entity $entity
    ): Entity {
        /** @var Collection<int, Report> $reports */
        $reports = $entity
            ->reports()
            ->where(
                'reports.status',
                'approved'
            )
            ->get();

        $reportCount =
            $reports->count();

        if ($reportCount === 0) {
            $entity->update([
                'report_count' => 0,
                'risk_score' => 0,
                'risk_level' => 'safe',
                'first_detected_at' => null,
                'last_report_at' => null,
            ]);

            return $entity->refresh();
        }

        $score =
            $this->calculateScore(
                $entity,
                $reports
            );

        $firstDetected =
            $reports
                ->min('created_at');

        $lastReport =
            $reports
                ->max('created_at');

        $entity->update([
            'report_count' =>
                $reportCount,

            'risk_score' =>
                $score,

            'risk_level' =>
                $this->riskLevel(
                    $score
                ),

            'first_detected_at' =>
                $firstDetected,

            'last_report_at' =>
                $lastReport,
        ]);

        return $entity->refresh();
    }

    private function calculateScore(
        Entity $entity,
        Collection $reports
    ): int {
        $score = 0;

        $score +=
            $this->reportCountScore(
                $reports->count()
            );

        $score +=
            $this->sourceDiversityScore(
                $reports
            );

        $score +=
            $this->lossScore(
                $reports
            );

        $score +=
            $this->recencyScore(
                $reports
            );

        $score +=
            $this->relationScore(
                $entity
            );

        return min(
            100,
            max(0, $score)
        );
    }

    private function reportCountScore(
        int $count
    ): int {
        return match (true) {
            $count >= 10 => 45,
            $count >= 7 => 40,
            $count >= 5 => 35,
            $count >= 3 => 28,
            $count >= 2 => 22,
            $count >= 1 => 15,
            default => 0,
        };
    }

    private function sourceDiversityScore(
        Collection $reports
    ): int {
        /*
         * submitter_hash là HMAC từ IP.
         * Đây chỉ là tín hiệu về sự đa dạng nguồn gửi,
         * không được hiểu là số người duy nhất.
         */
        $sourceCount = $reports
            ->pluck('submitter_hash')
            ->filter()
            ->unique()
            ->count();

        return match (true) {
            $sourceCount >= 5 => 15,
            $sourceCount >= 3 => 12,
            $sourceCount >= 2 => 8,
            $sourceCount >= 1 => 4,
            default => 0,
        };
    }

    private function lossScore(
        Collection $reports
    ): int {
        /*
         * Chỉ sử dụng số tiền từ report đã duyệt.
         * Đây là số tiền người gửi khai báo,
         * không phải thiệt hại đã được cơ quan
         * có thẩm quyền xác nhận.
         */
        $totalLoss = $reports
            ->sum(
                fn (Report $report) =>
                    max(
                        0,
                        (float) (
                            $report->loss_amount
                            ?? 0
                        )
                    )
            );

        return match (true) {
            $totalLoss >= 100_000_000 => 20,
            $totalLoss >= 50_000_000 => 17,
            $totalLoss >= 20_000_000 => 14,
            $totalLoss >= 10_000_000 => 11,
            $totalLoss >= 5_000_000 => 8,
            $totalLoss >= 1_000_000 => 5,
            $totalLoss > 0 => 2,
            default => 0,
        };
    }

    private function recencyScore(
        Collection $reports
    ): int {
        $latest = $reports
            ->max('created_at');

        if ($latest === null) {
            return 0;
        }

        $days =
            (int) floor(
                now()->diffInDays(
                    $latest,
                    true
                )
            );

        return match (true) {
            $days <= 7 => 10,
            $days <= 30 => 8,
            $days <= 90 => 6,
            $days <= 180 => 4,
            $days <= 365 => 2,
            default => 0,
        };
    }

    private function relationScore(
        Entity $entity
    ): int {
        /*
         * Chỉ đếm relation còn tồn tại.
         * Relation của report bị reject đã được
         * ReportModerationController xóa.
         */
        $relatedCount =
            EntityRelation::query()
                ->where(
                    'entity_id',
                    $entity->id
                )
                ->distinct(
                    'related_entity_id'
                )
                ->count(
                    'related_entity_id'
                );

        return match (true) {
            $relatedCount >= 5 => 10,
            $relatedCount >= 3 => 8,
            $relatedCount >= 2 => 6,
            $relatedCount >= 1 => 3,
            default => 0,
        };
    }

    private function riskLevel(
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
