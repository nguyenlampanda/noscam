<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use App\Models\EntityRelation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => [
                'required',
                'string',
                'min:3',
                'max:500',
            ],
        ]);

        $query = trim(
            $request->string('q')->toString()
        );

        $normalizedQuery =
            $this->normalizeQuery($query);

        /** @var Entity|null $entity */
        $entity = Entity::query()
            ->where(
                'normalized_value',
                $normalizedQuery
            )
            ->where('is_active', true)
            ->where('report_count', '>', 0)
            ->first();

        if ($entity === null) {
            return response()->json([
                'message' =>
                    'Chưa ghi nhận dữ liệu cảnh báo.',
                'data' => null,
            ]);
        }

        $entity->load(
            'relations.relatedEntity'
        );

        /** @var Collection<int, EntityRelation> $relations */
        $relations =
            $entity->getRelation('relations');

        $relatedInformation = $relations
            ->map(
                function (
                    EntityRelation $relation
                ): ?array {
                    $relatedEntity =
                        $relation->relatedEntity;

                    if (
                        $relatedEntity === null ||
                        ! $relatedEntity->is_active ||
                        $relatedEntity->report_count <= 0
                    ) {
                        return null;
                    }

                    return [
                        'id' =>
                            $relatedEntity->id,

                        'type' =>
                            $relatedEntity->type,

                        'value' =>
                            $relatedEntity->value,
                    ];
                }
            )
            ->filter()
            ->values()
            ->all();

        return response()->json([
            'data' => [
                'type' =>
                    $entity->type,

                'risk_score' =>
                    $entity->risk_score,

                'risk_label' =>
                    $this->riskLabel(
                        $entity->risk_level
                    ),

                'risk_level' =>
                    $entity->risk_level,

                'reports' =>
                    $entity->report_count,

                'first_detected' =>
                    $entity
                        ->first_detected_at
                        ?->format('d/m/Y'),

                'last_report' =>
                    $entity
                        ->last_report_at
                        ?->format('d/m/Y'),

                'status' =>
                    'Có dữ liệu cảnh báo',

                'risk_factors' =>
                    $this->riskFactors(
                        $entity
                    ),

                'related_information' =>
                    $relatedInformation,

                'sources' => [
                    'Báo cáo từ cộng đồng',
                    'Dữ liệu cảnh báo của hệ thống',
                ],
            ],
        ]);
    }

    private function normalizeQuery(
        string $query
    ): string {
        $query = strtolower(
            trim($query)
        );

        $query = preg_replace(
            '#^https?://#',
            '',
            $query
        );

        $query = preg_replace(
            '#^www\.#',
            '',
            $query
        );

        return rtrim(
            preg_replace(
                '/\s+/',
                '',
                $query
            ),
            '/'
        );
    }

    private function riskLabel(
        string $level
    ): string {
        return match ($level) {
            'safe' =>
                'Chưa ghi nhận rủi ro',

            'low' =>
                'Rủi ro thấp',

            'medium' =>
                'Rủi ro trung bình',

            'high' =>
                'Rủi ro cao',

            'dangerous' =>
                'Rủi ro rất cao',

            default =>
                'Chưa xác định',
        };
    }

    private function riskFactors(
        Entity $entity
    ): array {
        $factors = [];

        if ($entity->report_count > 0) {
            $factors[] = [
                'id' => 1,

                'title' =>
                    'Có báo cáo từ cộng đồng',

                'description' =>
                    "Hệ thống hiện ghi nhận {$entity->report_count} báo cáo liên quan.",

                'severity' =>
                    $entity->report_count >= 5
                        ? 'high'
                        : 'medium',
            ];
        }

        if (
            $entity->last_report_at !== null
        ) {
            $factors[] = [
                'id' => 2,

                'title' =>
                    'Có lịch sử báo cáo',

                'description' =>
                    'Thông tin này đã xuất hiện trong dữ liệu báo cáo của hệ thống.',

                'severity' =>
                    'medium',
            ];
        }

        return $factors;
    }
}