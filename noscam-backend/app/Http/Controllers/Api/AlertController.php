<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'category' => [
                'nullable',
                'string',
                'in:all,phone,bank,website,social,shop,rental,job',
            ],

            'risk' => [
                'nullable',
                'string',
                'in:all,high,medium,low',
            ],

            'sort' => [
                'nullable',
                'string',
                'in:latest,risk,reports',
            ],

            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:50',
            ],
        ]);

        $category =
            $validated['category']
            ?? 'all';

        $risk =
            $validated['risk']
            ?? 'all';

        $sort =
            $validated['sort']
            ?? 'latest';

        $perPage =
            $validated['per_page']
            ?? 12;

        $query = Entity::query()
            ->where(
                'is_active',
                true
            )
            ->where(
                'report_count',
                '>',
                0
            )
            ->whereIn(
                'risk_level',
                [
                    'low',
                    'medium',
                    'high',
                ]
            );

        if ($category !== 'all') {
            $types =
                $this->categoryTypes(
                    $category
                );

            $query->whereIn(
                'type',
                $types
            );
        }

        if ($risk !== 'all') {
            $query->where(
                'risk_level',
                $risk
            );
        }

        match ($sort) {
            'risk' =>
                $query
                    ->orderByDesc(
                        'risk_score'
                    )
                    ->orderByDesc(
                        'last_report_at'
                    ),

            'reports' =>
                $query
                    ->orderByDesc(
                        'report_count'
                    )
                    ->orderByDesc(
                        'risk_score'
                    ),

            default =>
                $query
                    ->orderByDesc(
                        'last_report_at'
                    )
                    ->orderByDesc(
                        'risk_score'
                    ),
        };

        $paginator =
            $query->paginate(
                $perPage
            );

        $items = collect(
            $paginator->items()
        )->map(
            fn (Entity $entity) => [
                'id' =>
                    $entity->id,

                'category' =>
                    $this->categoryFor(
                        $entity->type
                    ),

                'type' =>
                    $this->typeLabel(
                        $entity->type
                    ),

                'entity_type' =>
                    $entity->type,

                'value' =>
                    $entity->value,

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

                'description' =>
                    $this->description(
                        $entity
                    ),

                'time' =>
                    $entity->last_report_at
                        ?->diffForHumans(),

                'last_report_at' =>
                    $entity->last_report_at
                        ?->toISOString(),
            ]
        )->values();

        return response()->json([
            'data' => $items,

            'meta' => [
                'current_page' =>
                    $paginator
                        ->currentPage(),

                'last_page' =>
                    $paginator
                        ->lastPage(),

                'per_page' =>
                    $paginator
                        ->perPage(),

                'total' =>
                    $paginator->total(),

                'filters' => [
                    'category' =>
                        $category,

                    'risk' =>
                        $risk,

                    'sort' =>
                        $sort,
                ],
            ],
        ]);
    }

    private function categoryTypes(
        string $category
    ): array {
        return match ($category) {
            'phone' => [
                'phone',
            ],

            'bank' => [
                'bank_account',
            ],

            'website' => [
                'website',
            ],

            'social' => [
                'social',
                'facebook',
                'tiktok',
                'telegram',
                'zalo',
            ],

            'shop' => [
                'shop',
            ],

            'rental' => [
                'rental',
            ],

            'job' => [
                'recruitment',
                'job',
            ],

            default => [],
        };
    }

    private function categoryFor(
        string $type
    ): string {
        return match ($type) {
            'phone' =>
                'phone',

            'bank_account' =>
                'bank',

            'website' =>
                'website',

            'social',
            'facebook',
            'tiktok',
            'telegram',
            'zalo' =>
                'social',

            'shop' =>
                'shop',

            'rental' =>
                'rental',

            'recruitment',
            'job' =>
                'job',

            default =>
                'other',
        };
    }

    private function typeLabel(
        string $type
    ): string {
        return match ($type) {
            'phone' =>
                'Số điện thoại',

            'bank_account' =>
                'Số tài khoản ngân hàng',

            'website' =>
                'Website / tên miền',

            'facebook' =>
                'Facebook',

            'tiktok' =>
                'TikTok',

            'telegram' =>
                'Telegram',

            'zalo' =>
                'Zalo',

            'social' =>
                'Mạng xã hội',

            'shop' =>
                'Shop / người bán',

            'rental' =>
                'Phòng trọ',

            'recruitment',
            'job' =>
                'Tuyển dụng',

            default =>
                'Thông tin',
        };
    }

    private function riskLabel(
        string $level
    ): string {
        return match ($level) {
            'high' =>
                'Rủi ro cao',

            'medium' =>
                'Rủi ro trung bình',

            'low' =>
                'Rủi ro thấp',

            default =>
                'Chưa xác định',
        };
    }

    private function description(
        Entity $entity
    ): string {
        return "Hệ thống ghi nhận {$entity->report_count} báo cáo đã duyệt có liên quan đến thông tin này.";
    }
}
