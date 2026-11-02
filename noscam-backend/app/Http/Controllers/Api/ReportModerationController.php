<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use App\Models\EntityRelation;
use App\Models\Report;
use App\Models\ReportModerationLog;
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

        $result = DB::transaction(
            function () use (
                $request,
                $report,
                $newStatus
            ) {
                $lockedReport = Report::query()
                    ->whereKey($report->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $oldStatus = $lockedReport->status;

                if ($oldStatus === $newStatus) {
                    return [
                        'report' => $lockedReport,
                        'unchanged' => true,
                    ];
                }

                if ($newStatus === 'approved') {
                    $updatedReport = $this->approve(
                        $lockedReport
                    );
                } else {
                    $updatedReport = $this->reject(
                        $lockedReport
                    );
                }

                ReportModerationLog::create([
                    'report_id' => $lockedReport->id,
                    'user_id' => $request->user()?->id,
                    'from_status' => $oldStatus,
                    'to_status' => $newStatus,
                ]);

                return [
                    'report' => $updatedReport,
                    'unchanged' => false,
                ];
            }
        );

        /** @var Report $updatedReport */
        $updatedReport = $result['report'];

        // NOSCAM_AUTO_PUBLISH_ON_APPROVAL_V1
        // Tự tạo bản sao có watermark khi báo cáo vừa được duyệt.
        if ($newStatus === 'approved' && ! $result['unchanged']) {
            $failedImages = [];

            $evidences = \App\Models\Evidence::query()
                ->where('report_id', $updatedReport->id)
                ->whereIn('mime_type', [
                    'image/jpeg',
                    'image/png',
                    'image/webp',
                ])
                ->orderBy('id')
                ->limit(3)
                ->get();

            foreach ($evidences as $evidence) {
                try {
                    $confirmationRequest = \Illuminate\Http\Request::create(
                        '/',
                        'POST',
                        ['confirm_redacted' => true]
                    );

                    app(PublicEvidenceController::class)->publish(
                        $confirmationRequest,
                        $evidence
                    );
                } catch (\Throwable $exception) {
                    $failedImages[] = $evidence->id;

                    \Illuminate\Support\Facades\Log::error(
                        'Không thể công khai ảnh bằng chứng',
                        [
                            'report_id' => $updatedReport->id,
                            'evidence_id' => $evidence->id,
                            'error' => $exception->getMessage(),
                        ]
                    );
                }
            }

            if ($failedImages) {
                return response()->json([
                    'message' => 'Báo cáo đã duyệt, nhưng một số ảnh chưa được công khai.',
                    'data' => [
                        'id' => $updatedReport->id,
                        'status' => $updatedReport->status,
                        'failed_evidence_ids' => $failedImages,
                    ],
                ], 207);
            }
        }



        if ($result['unchanged']) {
            return response()->json([
                'message' =>
                    $newStatus === 'approved'
                        ? 'Báo cáo đã ở trạng thái đã duyệt.'
                        : 'Báo cáo đã ở trạng thái từ chối.',

                'data' => [
                    'id' => $updatedReport->id,
                    'status' => $updatedReport->status,
                    'updated_at' => $updatedReport->updated_at,
                ],
            ]);
        }

        return response()->json([
            'message' =>
                $updatedReport->status === 'approved'
                    ? 'Báo cáo đã được duyệt.'
                    : 'Báo cáo đã bị từ chối.',

            'data' => [
                'id' => $updatedReport->id,
                'status' => $updatedReport->status,
                'updated_at' => $updatedReport->updated_at,
            ],
        ]);
    }

    private function approve(
        Report $report
    ): Report {
        $report->update([
            'status' => 'approved',
        ]);

        $entities = $this->publishEntities(
            $report
        );

        $this->createRelations(
            $report,
            $entities
        );

        $this->updateRiskForEntities(
            $entities
        );

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

        $this->updateRiskForEntities(
            $entities
        );

        return $report->refresh();
    }

    private function publishEntities(
        Report $report
    ): Collection {
        $entityData = [
            'phone' => $report->phone,
            'bank_account' => $report->bank_account,
            'social' => $report->social,
            'website' => $report->website,
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
                    'entity_id' => $first->id,
                    'related_entity_id' => $second->id,
                    'report_id' => $report->id,
                    'relation_type' => 'reported_together',
                ]);

                EntityRelation::firstOrCreate([
                    'entity_id' => $second->id,
                    'related_entity_id' => $first->id,
                    'report_id' => $report->id,
                    'relation_type' => 'reported_together',
                ]);
            }
        }
    }

    private function updateRiskForEntities(
        Collection $entities
    ): void {
        foreach (
            $entities
                ->unique('id')
                ->values()
            as $entity
        ) {
            $this->riskService->update(
                $entity
            );
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
                    '~[^0-9]+~',
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
                        '~\s+~',
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
                '~^\s*(?:\+84|84)[\s.()_-]*~',
                $value
            ) === 1;

        $digits =
            preg_replace(
                '~[^0-9]+~',
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
            return '0'.substr(
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

        $value = preg_replace(
            '~^https?://~',
            '',
            $value
        ) ?? '';

        $value = preg_replace(
            '~^www\.~',
            '',
            $value
        ) ?? '';

        /*
         * Website entity dùng domain
         * làm canonical value.
         */
        $value = preg_replace(
            '~[/?#].*$~',
            '',
            $value
        ) ?? '';

        return trim($value);
    }

    private function normalizeSocial(
        string $value
    ): string {
        $value = strtolower(
            trim($value)
        );

        $value = preg_replace(
            '~^https?://~',
            '',
            $value
        ) ?? '';

        $value = preg_replace(
            '~^www\.~',
            '',
            $value
        ) ?? '';

        $value = preg_replace(
            '~^m\.facebook\.com/~',
            'facebook.com/',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~^fb\.com/~',
            'facebook.com/',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~^telegram\.me/~',
            't.me/',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~[?#].*$~',
            '',
            $value
        ) ?? '';

        return rtrim(
            $value,
            '/'
        );
    }
}