<?php

namespace App\Services;

use App\Models\Entity;

class RiskService
{
    public function update(Entity $entity): Entity
    {
        $approvedReports = $entity
            ->reports()
            ->where('status', 'approved');

        $reportCount = (clone $approvedReports)->count();

        $firstDetectedAt = (clone $approvedReports)
            ->orderBy('created_at')
            ->value('reports.created_at');

        $lastReportAt = (clone $approvedReports)
            ->orderByDesc('created_at')
            ->value('reports.created_at');

        $score = match (true) {
            $reportCount >= 10 => 90,
            $reportCount >= 7 => 80,
            $reportCount >= 5 => 70,
            $reportCount >= 3 => 60,
            $reportCount >= 2 => 45,
            $reportCount >= 1 => 30,
            default => 0,
        };

        $level = match (true) {
            $score >= 80 => 'high',
            $score >= 50 => 'medium',
            $score >= 20 => 'low',
            default => 'safe',
        };

        $entity->update([
            'report_count' => $reportCount,
            'risk_score' => $score,
            'risk_level' => $level,
            'first_detected_at' => $firstDetectedAt,
            'last_report_at' => $lastReportAt,
        ]);

        return $entity->refresh();
    }
}