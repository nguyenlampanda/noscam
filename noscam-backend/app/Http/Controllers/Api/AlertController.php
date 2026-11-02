<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    // NOSCAM_ONE_REPORT_ONE_ALERT_V1
    // Mỗi báo cáo được duyệt chỉ xuất hiện một lần.
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => [
                'nullable', 'string',
                'in:all,phone,bank,website,social,shop,rental,job',
            ],
            'risk' => [
                'nullable', 'string',
                'in:all,high,medium,low',
            ],
            'sort' => [
                'nullable', 'string',
                'in:latest,risk,reports',
            ],
            'page' => [
                'nullable', 'integer', 'min:1',
            ],
            'per_page' => [
                'nullable', 'integer', 'min:1', 'max:50',
            ],
        ]);

        $category = $validated['category'] ?? 'all';
        $risk = $validated['risk'] ?? 'all';
        $sort = $validated['sort'] ?? 'latest';
        $perPage = $validated['per_page'] ?? 12;

        // Cùng một bộ điều kiện dùng cho lọc và chọn entity đại diện.
        $entityFilter = function ($query) use ($category, $risk) {
            $query->where('is_active', true)
                ->where('report_count', '>', 0)
                ->whereIn('risk_level', [
                    'low', 'medium', 'high',
                ]);

            if ($category !== 'all') {
                $query->whereIn(
                    'type',
                    $this->categoryTypes($category)
                );
            }

            if ($risk !== 'all') {
                $query->where('risk_level', $risk);
            }
        };

        $query = \App\Models\Report::query()
            ->where('status', 'approved')
            ->whereHas('entities', $entityFilter)
            ->with([
                'entities' => $entityFilter,
            ])
            ->withMax(
                ['entities as sort_risk' => $entityFilter],
                'risk_score'
            )
            ->withMax(
                ['entities as sort_reports' => $entityFilter],
                'report_count'
            );

        match ($sort) {
            'risk' => $query
                ->orderByDesc('sort_risk')
                ->orderByDesc('reports.updated_at')
                ->orderByDesc('reports.id'),

            'reports' => $query
                ->orderByDesc('sort_reports')
                ->orderByDesc('reports.updated_at')
                ->orderByDesc('reports.id'),

            default => $query
                ->orderByDesc('reports.updated_at')
                ->orderByDesc('reports.id'),
        };

        $paginator = $query->paginate($perPage);

        $reportIds = collect($paginator->items())
            ->pluck('id')
            ->all();

        // Chỉ lấy ảnh đã được công khai của chính báo cáo đó.
        $imagesByReport = \Illuminate\Support\Facades\DB::table(
            'public_evidence_images as p'
        )
            ->join(
                'evidences as ev',
                'ev.id',
                '=',
                'p.evidence_id'
            )
            ->whereIn('ev.report_id', $reportIds)
            ->where('p.is_public', true)
            ->orderByDesc('p.published_at')
            ->orderByDesc('p.id')
            ->get([
                'p.id',
                'ev.report_id',
            ])
            ->groupBy('report_id');

        // Thời gian duyệt gần nhất của từng báo cáo.
        $approvalTimes = \Illuminate\Support\Facades\DB::table(
            'report_moderation_logs'
        )
            ->whereIn('report_id', $reportIds)
            ->where('to_status', 'approved')
            ->selectRaw(
                'report_id, MAX(created_at) as approved_at'
            )
            ->groupBy('report_id')
            ->pluck('approved_at', 'report_id');

        $items = collect($paginator->items())
            ->map(function ($report) use (
                $imagesByReport,
                $approvalTimes
            ) {
                $entity = $report->entities
                    ->sortByDesc('risk_score')
                    ->first();

                if (! $entity) {
                    return null;
                }

                $approvedAt = $approvalTimes[$report->id]
                    ?? $report->updated_at;

                $date = \Carbon\Carbon::parse($approvedAt);
                $seconds = max(
                    0,
                    (int) $date->diffInSeconds(now())
                );

                if ($seconds < 60) {
                    $time = 'Vừa cập nhật';
                } elseif ($seconds < 3600) {
                    $time = floor($seconds / 60)
                        . ' phút trước';
                } elseif ($seconds < 86400) {
                    $time = floor($seconds / 3600)
                        . ' giờ trước';
                } elseif ($seconds < 2592000) {
                    $time = floor($seconds / 86400)
                        . ' ngày trước';
                } else {
                    $time = $date->format('d/m/Y');
                }

                $images = collect(
                    $imagesByReport->get($report->id, collect())
                )
                    ->take(3)
                    ->map(fn ($image) => url(
                        '/api/alerts/public-images/' . $image->id
                    ))
                    ->values()
                    ->all();

                return [
                    'id' => $report->id,
                    'report_id' => $report->id,

                    'category' => $this->categoryFor(
                        $entity->type
                    ),
                    'type' => $this->typeLabel(
                        $entity->type
                    ),
                    'entity_type' => $entity->type,
                    'value' => $entity->value,

                    'risk_score' => $entity->risk_score,
                    'risk_level' => $entity->risk_level,
                    'risk_label' => $this->riskLabel(
                        $entity->risk_level
                    ),

                    'reports' => 1,
                    'description' =>
                        'Hệ thống ghi nhận 1 báo cáo đã duyệt liên quan đến thông tin này.',

                    'time' => $time,
                    'last_report_at' => $date->toISOString(),
                    'public_images' => $images,
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'filters' => [
                    'category' => $category,
                    'risk' => $risk,
                    'sort' => $sort,
                ],
            ],
        ]);
    }

    // NOSCAM_APPROVAL_TIME_V1
    private function latestApprovalTime(Entity $entity): ?string
    {
        $approvedAt = \Illuminate\Support\Facades\DB::table(
            'report_moderation_logs as ml'
        )
            ->join(
                'entity_report as er',
                'er.report_id',
                '=',
                'ml.report_id'
            )
            ->join(
                'reports as r',
                'r.id',
                '=',
                'ml.report_id'
            )
            ->where('er.entity_id', $entity->id)
            ->where('r.status', 'approved')
            ->where('ml.to_status', 'approved')
            ->max('ml.created_at');

        if ($approvedAt) {
            $date = \Carbon\Carbon::parse($approvedAt);

            $seconds = max(0, $date->diffInSeconds(now()));

            if ($seconds < 60) {
                return 'Vừa cập nhật';
            }

            if ($seconds < 3600) {
                return floor($seconds / 60) . ' phút trước';
            }

            if ($seconds < 86400) {
                return floor($seconds / 3600) . ' giờ trước';
            }

            if ($seconds < 2592000) {
                return floor($seconds / 86400) . ' ngày trước';
            }

            return $date->format('d/m/Y');
        }

        return $entity->last_report_at
            ?->locale('vi')
            ->diffForHumans();
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
