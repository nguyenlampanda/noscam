<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mediator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediatorController extends Controller
{
    private const DISCLAIMER =
        'NoScam đang ghi nhận hồ sơ và số tiền cọc được hiển thị tại thời điểm cập nhật. Thông tin này không phải bảo đảm tuyệt đối cho mọi giao dịch.';

    public function index(
        Request $request
    ): JsonResponse {
        $search = trim(
            (string) $request->input(
                'search',
                ''
            )
        );

        $query = Mediator::query()
            ->where('is_public', true)
            ->where(
                'status',
                '!=',
                'removed'
            )
            ->with([
                'identifiers' =>
                    fn ($query) =>
                        $query->where(
                            'is_public',
                            true
                        ),
            ])
            ->withSum(
                'depositLogs as deposit_balance',
                'amount'
            );

        if ($search !== '') {
            $normalized =
                $this->normalize($search);

            $query->where(
                function ($query) use (
                    $search,
                    $normalized
                ) {
                    $query
                        ->where(
                            'name',
                            'like',
                            '%'.$search.'%'
                        )
                        ->orWhere(
                            'code',
                            'like',
                            '%'.$search.'%'
                        )
                        ->orWhereHas(
                            'identifiers',
                            function ($query) use (
                                $search,
                                $normalized
                            ) {
                                $query
                                    ->where(
                                        'value',
                                        'like',
                                        '%'.$search.'%'
                                    )
                                    ->orWhere(
                                        'normalized_value',
                                        'like',
                                        '%'.$normalized.'%'
                                    );
                            }
                        );
                }
            );
        }

        $result = $query
            ->orderByRaw(
                "status = 'active' DESC"
            )
            ->orderByDesc(
                'deposit_balance'
            )
            ->paginate(12);

        $result
            ->getCollection()
            ->transform(
                fn (Mediator $mediator) =>
                    $this->publicData(
                        $mediator
                    )
            );

        return response()->json([
            'data' => $result,
            'disclaimer' =>
                self::DISCLAIMER,
        ]);
    }

    public function lookup(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'q' => [
                'required',
                'string',
                'min:2',
                'max:500',
            ],
        ]);

        $raw = trim($data['q']);

        $normalized =
            $this->normalize($raw);

        $mediator = Mediator::query()
            ->where('is_public', true)
            ->where(
                'status',
                '!=',
                'removed'
            )
            ->where(
                function ($query) use (
                    $raw,
                    $normalized
                ) {
                    $query
                        ->where(
                            'code',
                            strtoupper($raw)
                        )
                        ->orWhereHas(
                            'identifiers',
                            fn ($query) =>
                                $query->where(
                                    'normalized_value',
                                    $normalized
                                )
                        );
                }
            )
            ->with([
                'identifiers' =>
                    fn ($query) =>
                        $query->where(
                            'is_public',
                            true
                        ),
            ])
            ->withSum(
                'depositLogs as deposit_balance',
                'amount'
            )
            ->first();

        return response()->json([
            'data' =>
                $mediator
                    ? $this->publicData(
                        $mediator
                    )
                    : null,

            'matched' =>
                $mediator !== null,

            'disclaimer' =>
                self::DISCLAIMER,
        ]);
    }

    public function show(
        string $code
    ): JsonResponse {
        $mediator = Mediator::query()
            ->where(
                'code',
                strtoupper($code)
            )
            ->where(
                'is_public',
                true
            )
            ->with([
                'identifiers' =>
                    fn ($query) =>
                        $query->where(
                            'is_public',
                            true
                        ),

                'depositLogs' =>
                    fn ($query) =>
                        $query
                            ->orderByDesc(
                                'recorded_at'
                            )
                            ->orderByDesc(
                                'id'
                            ),
            ])
            ->withSum(
                'depositLogs as deposit_balance',
                'amount'
            )
            ->firstOrFail();

        return response()->json([
            'data' =>
                $this->publicData(
                    $mediator,
                    true
                ),

            'disclaimer' =>
                self::DISCLAIMER,
        ]);
    }

    private function publicData(
        Mediator $mediator,
        bool $withHistory = false
    ): array {
        $data = [
            'id' => $mediator->id,
            'code' => $mediator->code,
            'name' => $mediator->name,

            'description' =>
                $mediator->description,

            'status' =>
                $mediator->status,

            'deposit_balance' =>
                (int)
                $mediator
                    ->deposit_balance,

            'verified_at' =>
                $mediator
                    ->verified_at
                    ?->toISOString(),

            'updated_at' =>
                $mediator
                    ->updated_at
                    ?->toISOString(),

            'identifiers' =>
                $mediator
                    ->identifiers
                    ->map(
                        fn ($item) => [
                            'id' =>
                                $item->id,

                            'type' =>
                                $item->type,

                            'value' =>
                                $item->value,

                            'label' =>
                                $item->label,

                            'bank_name' =>
                                $item
                                    ->bank_name,
                        ]
                    )
                    ->values(),
        ];

        if ($withHistory) {
            $data[
                'deposit_history'
            ] = $mediator
                ->depositLogs
                ->map(
                    fn ($log) => [
                        'id' =>
                            $log->id,

                        'amount' =>
                            (int)
                            $log->amount,

                        'note' =>
                            $log->note,

                        'recorded_at' =>
                            $log
                                ->recorded_at
                                ?->format(
                                    'Y-m-d'
                                ),
                    ]
                )
                ->values();
        }

        return $data;
    }

    private function normalize(
        string $value
    ): string {
        $value = trim($value);

        if (
            preg_match(
                '/^[\d\s.+()-]+$/',
                $value
            )
        ) {
            return preg_replace(
                '/\D+/',
                '',
                $value
            );
        }

        $value = strtolower($value);

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

        return rtrim(
            $value,
            '/'
        );
    }
}
