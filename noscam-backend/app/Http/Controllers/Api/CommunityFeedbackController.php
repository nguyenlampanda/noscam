<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityFeedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CommunityFeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => [
                'required',
                'string',
                'max:50',
            ],
            'value' => [
                'required',
                'string',
                'max:500',
            ],
        ]);

        return response()->json([
            'data' => $this->summary(
                $data['type'],
                $data['value']
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => [
                'required',
                'string',
                'max:50',
            ],
            'value' => [
                'required',
                'string',
                'max:500',
            ],
            'feedback' => [
                'required',
                'string',
                'in:' . implode(
                    ',',
                    CommunityFeedback::TYPES
                ),
            ],
        ]);

        $sourceHash = hash_hmac(
            'sha256',
            (string) $request->ip(),
            (string) config('app.key')
        );

        $feedback = CommunityFeedback::query()
            ->updateOrCreate(
                [
                    'entity_type' =>
                        $data['type'],

                    'normalized_value' =>
                        $data['value'],

                    'source_hash' =>
                        $sourceHash,
                ],
                [
                    'feedback_type' =>
                        $data['feedback'],
                ]
            );

        return response()->json([
            'message' =>
                'Cảm ơn bạn đã đóng góp tín hiệu.',

            'data' => [
                'selected' =>
                    $feedback->feedback_type,

                'summary' =>
                    $this->summary(
                        $data['type'],
                        $data['value']
                    ),
            ],
        ]);
    }

    private function summary(
        string $type,
        string $value
    ): array {
        $counts = CommunityFeedback::query()
            ->where('entity_type', $type)
            ->where('normalized_value', $value)
            ->selectRaw(
                'feedback_type, COUNT(*) as total'
            )
            ->groupBy('feedback_type')
            ->pluck(
                'total',
                'feedback_type'
            );

        $items = [];

        foreach (
            CommunityFeedback::TYPES as $feedbackType
        ) {
            $items[$feedbackType] =
                (int) ($counts[$feedbackType] ?? 0);
        }

        return [
            'total' =>
                array_sum($items),

            'counts' =>
                $items,

            /*
             * Đây chỉ là tín hiệu cộng đồng.
             * Không phải Risk Score.
             */
            'affects_risk_score' =>
                false,
        ];
    }
}
