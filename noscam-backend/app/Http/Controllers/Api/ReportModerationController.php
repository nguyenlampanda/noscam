<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use App\Models\EntityRelation;
use App\Models\Report;
use App\Services\RiskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReportModerationController extends Controller
{
    public function __construct(
        private readonly RiskService $riskService
    ) {
    }

    public function update(
        Request $request,
        Report $report
    ): JsonResponse {
        $validated = $request->validate([
            'status' => [
                'required',
                'string',
                Rule::in([
                    'approved',
                    'rejected',
                ]),
            ],
        ]);

        $newStatus = $validated['status'];

        $report = DB::transaction(
            function () use ($report, $newStatus) {
                if ($report->status === $newStatus) {
                    return $report->refresh();
                }

                if ($newStatus === 'approved') {
                    $report->update([
                        'status' => 'approved',
                    ]);

                    $entities = $this->publishReport($report);

                    foreach ($entities as $entity) {
                        $this->riskService->update($entity);
                    }

                    return $report->refresh();
                }

                /*
                 * Khi rejected:
                 * Giữ lại pivot/entity để bảo toàn lịch sử moderation.
                 *
                 * RiskService chỉ tính report có status approved,
                 * nên report rejected sẽ tự động không còn ảnh hưởng score.
                 */
                $entities = $report
                    ->entities()
                    ->get();

                $report->update([
                    'status' => 'rejected',
                ]);

                foreach ($entities as $entity) {
                    $this->riskService->update($entity);
                }

                return $report->refresh();
            }
        );

        return response()->json([
            'message' =>
                $report->status === 'approved'
                    ? 'Báo cáo đã được duyệt.'
                    : 'Báo cáo đã bị từ chối.',

            'data' => [
                'id' => $report->id,
                'status' => $report->status,
                'updated_at' => $report->updated_at,
            ],
        ]);
    }

    private function publishReport(
        Report $report
    ): Collection {
        $entityData = [
            'phone' => $report->phone,
            'bank_account' => $report->bank_account,
            'social' => $report->social,
            'website' => $report->website,
        ];

        $entities = collect();

        foreach ($entityData as $type => $value) {
            if (! filled($value)) {
                continue;
            }

            $normalizedValue = $this->normalizeValue(
                $type,
                $value
            );

            $entity = Entity::firstOrCreate(
                [
                    'type' => $type,
                    'normalized_value' => $normalizedValue,
                ],
                [
                    'value' => trim($value),
                    'report_count' => 0,
                    'risk_score' => 0,
                    'risk_level' => 'safe',
                    'is_active' => true,
                ]
            );

            $entities->push($entity);
        }

        $entities = $entities
            ->unique('id')
            ->values();

        $entityIds = $entities
            ->pluck('id')
            ->all();

        if (! empty($entityIds)) {
            $report
                ->entities()
                ->syncWithoutDetaching($entityIds);
        }

        $this->createEntityRelations(
            $entities->all()
        );

        return $entities;
    }

    private function normalizeValue(
        string $type,
        string $value
    ): string {
        $value = trim($value);

        return match ($type) {
            'phone',
            'bank_account' =>
                preg_replace('/\D+/', '', $value),

            'website' =>
                $this->normalizeWebsite($value),

            'social' =>
                strtolower(
                    rtrim($value, '/')
                ),

            default =>
                strtolower(
                    preg_replace(
                        '/\s+/',
                        '',
                        $value
                    )
                ),
        };
    }

    private function normalizeWebsite(
        string $value
    ): string {
        $value = strtolower(trim($value));

        $value = preg_replace(
            '#^https?://#',
            '',
            $value
        );

        $value = preg_replace(
            '#^www\.#',
            '',
            $value
        );

        return rtrim($value, '/');
    }

    private function createEntityRelations(
        array $entities
    ): void {
        $count = count($entities);

        for ($i = 0; $i < $count; $i++) {
            for (
                $j = $i + 1;
                $j < $count;
                $j++
            ) {
                $first = $entities[$i];
                $second = $entities[$j];

                EntityRelation::firstOrCreate([
                    'entity_id' =>
                        $first->id,

                    'related_entity_id' =>
                        $second->id,

                    'relation_type' =>
                        'reported_together',
                ]);

                EntityRelation::firstOrCreate([
                    'entity_id' =>
                        $second->id,

                    'related_entity_id' =>
                        $first->id,

                    'relation_type' =>
                        'reported_together',
                ]);
            }
        }
    }
}