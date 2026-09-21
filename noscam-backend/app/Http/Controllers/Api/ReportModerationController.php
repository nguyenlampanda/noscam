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

        if ($report->status === $newStatus) {
            return response()->json([
                'message' =>
                    $newStatus === 'approved'
                        ? 'Báo cáo đã ở trạng thái đã duyệt.'
                        : 'Báo cáo đã ở trạng thái từ chối.',

                'data' => [
                    'id' => $report->id,
                    'status' => $report->status,
                    'updated_at' => $report->updated_at,
                ],
            ]);
        }

        $report = DB::transaction(
            function () use (
                $report,
                $newStatus
            ) {
                if ($newStatus === 'approved') {
                    return $this->approve(
                        $report
                    );
                }

                return $this->reject(
                    $report
                );
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

    private function approve(
        Report $report
    ): Report {
        $report->update([
            'status' => 'approved',
        ]);

        $entities =
            $this->publishEntities(
                $report
            );

        $this->createRelations(
            $report,
            $entities
        );

        foreach ($entities as $entity) {
            $this->riskService->update(
                $entity
            );
        }

        return $report->refresh();
    }

    private function reject(
        Report $report
    ): Report {
        $entities = $report
            ->entities()
            ->get();

        $report->update([
            'status' => 'rejected',
        ]);

        EntityRelation::query()
            ->where(
                'report_id',
                $report->id
            )
            ->delete();

        foreach ($entities as $entity) {
            $this->riskService->update(
                $entity
            );
        }

        return $report->refresh();
    }

    private function publishEntities(
        Report $report
    ): Collection {
        $entityData = [
            'phone' =>
                $report->phone,

            'bank_account' =>
                $report->bank_account,

            'social' =>
                $report->social,

            'website' =>
                $report->website,
        ];

        $entities = collect();

        foreach (
            $entityData as $type => $value
        ) {
            if (! filled($value)) {
                continue;
            }

            $normalizedValue =
                $this->normalizeValue(
                    $type,
                    $value
                );

            if ($normalizedValue === '') {
                continue;
            }

            $entity =
                Entity::firstOrCreate(
                    [
                        'type' =>
                            $type,

                        'normalized_value' =>
                            $normalizedValue,
                    ],
                    [
                        'value' =>
                            trim($value),

                        'report_count' =>
                            0,

                        'risk_score' =>
                            0,

                        'risk_level' =>
                            'safe',

                        'is_active' =>
                            true,
                    ]
                );

            if (! $entity->is_active) {
                $entity->update([
                    'is_active' => true,
                ]);
            }

            $entities->push($entity);
        }

        $entities = $entities
            ->unique('id')
            ->values();

        if ($entities->isNotEmpty()) {
            $report
                ->entities()
                ->syncWithoutDetaching(
                    $entities
                        ->pluck('id')
                        ->all()
                );
        }

        return $entities;
    }

    private function createRelations(
        Report $report,
        Collection $entities
    ): void {
        $items = $entities
            ->values()
            ->all();

        $count = count($items);

        for ($i = 0; $i < $count; $i++) {
            for (
                $j = $i + 1;
                $j < $count;
                $j++
            ) {
                $first = $items[$i];
                $second = $items[$j];

                EntityRelation::firstOrCreate([
                    'entity_id' =>
                        $first->id,

                    'related_entity_id' =>
                        $second->id,

                    'report_id' =>
                        $report->id,

                    'relation_type' =>
                        'reported_together',
                ]);

                EntityRelation::firstOrCreate([
                    'entity_id' =>
                        $second->id,

                    'related_entity_id' =>
                        $first->id,

                    'report_id' =>
                        $report->id,

                    'relation_type' =>
                        'reported_together',
                ]);
            }
        }
    }

    private function normalizeValue(
        string $type,
        string $value
    ): string {
        $value = trim($value);

        return match ($type) {
            'phone' =>
                $this->normalizePhone(
                    $value
                ),

            'bank_account' =>
                preg_replace(
                    '/\D+/',
                    '',
                    $value
                ) ?? '',

            'website' =>
                $this->normalizeWebsite(
                    $value
                ),

            'social' =>
                $this->normalizeSocial(
                    $value
                ),

            default =>
                strtolower(
                    preg_replace(
                        '/\s+/',
                        '',
                        $value
                    ) ?? ''
                ),
        };
    }

    private function normalizePhone(
        string $value
    ): string {
        $value = trim($value);

        $hasVietnamCountryCode =
            preg_match(
                '/^\s*(?:\+84|84)[\s.\-()]*/',
                $value
            ) === 1;

        $digits =
            preg_replace(
                '/\D+/',
                '',
                $value
            ) ?? '';

        if ($digits === '') {
            return '';
        }

        if (
            $hasVietnamCountryCode &&
            str_starts_with(
                $digits,
                '84'
            )
        ) {
            return '0' .
                substr(
                    $digits,
                    2
                );
        }

        return $digits;
    }

    private function normalizeWebsite(
        string $value
    ): string {
        $value = strtolower(
            trim($value)
        );

        $value =
            preg_replace(
                '#^https?://#',
                '',
                $value
            ) ?? '';

        $value =
            preg_replace(
                '#^www\.#',
                '',
                $value
            ) ?? '';

        $value =
            preg_replace(
                '#[?#].*$#',
                '',
                $value
            ) ?? '';

        return rtrim(
            $value,
            '/'
        );
    }

    private function normalizeSocial(
        string $value
    ): string {
        return strtolower(
            rtrim(
                trim($value),
                '/'
            )
        );
    }
}