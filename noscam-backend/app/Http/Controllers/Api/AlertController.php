<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'category' => ['nullable', 'string', 'max:50'],
        ]);

        $query = Entity::query()
            ->where('is_active', true)
            ->where('report_count', '>', 0)
            ->orderByDesc('last_report_at');

        if ($request->filled('category')) {
            $query->where(
                'type',
                $request->string('category')->toString()
            );
        }

        $alerts = $query
            ->paginate(20)
            ->through(function (Entity $entity) {
                return [
                    'id' => $entity->id,
                    'category' => $entity->type,
                    'type' => $entity->type,
                    'value' => $entity->value,

                    'description' =>
                        'Thông tin đang có dữ liệu báo cáo được hệ thống ghi nhận.',

                    'risk_label' =>
                        $this->riskLabel($entity->risk_level),

                    'risk_level' => $entity->risk_level,
                    'reports' => $entity->report_count,

                    'time' =>
                        $entity->last_report_at?->diffForHumans(),
                ];
            });

        return response()->json($alerts);
    }

    private function riskLabel(string $level): string
    {
        return match ($level) {
            'safe' => 'Chưa ghi nhận rủi ro',
            'low' => 'Rủi ro thấp',
            'medium' => 'Rủi ro trung bình',
            'high' => 'Rủi ro cao',
            'dangerous' => 'Rủi ro rất cao',
            default => 'Chưa xác định',
        };
    }
}