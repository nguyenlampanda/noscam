<?php

namespace App\Http\Controllers\Api;

use App\Models\MediatorDepositLog;

use App\Http\Controllers\Controller;
use App\Models\Mediator;
use App\Models\MediatorIdentifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminMediatorController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $query = Mediator::query()
            ->with('identifiers.bank')
            ->withSum(
                'depositLogs as deposit_balance',
                'amount'
            );

        if ($request->filled('search')) {
            $search = trim(
                (string)
                $request->input('search')
            );

            $query->where(
                function ($query) use (
                    $search
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
                            'identifiers.bank',
                            fn ($query) =>
                                $query->where(
                                    'value',
                                    'like',
                                    '%'.$search.'%'
                                )
                        );
                }
            );
        }

        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->input('status')
            );
        }

        return response()->json([
            'data' =>
                $query
                    ->latest()
                    ->paginate(20),
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $data =
            $this->validateData(
                $request
            );

        $mediator = DB::transaction(
            function () use ($data) {
                $mediator =
                    Mediator::create([
                        'code' =>
                            $this->nextCode(),

                        'name' =>
                            $data['name'],

                        'description' =>
                            $data[
                                'description'
                            ] ?? null,

                        'status' =>
                            $data[
                                'status'
                            ],

                        'is_public' =>
                            $data[
                                'is_public'
                            ],

                        'admin_note' =>
                            $data[
                                'admin_note'
                            ] ?? null,

                        'verified_at' =>
                            now(),
                    ]);

                $this->syncIdentifiers(
                    $mediator,
                    $data[
                        'identifiers'
                    ] ?? []
                );

                $initialDeposit =
                    (int) (
                        $data[
                            'initial_deposit'
                        ] ?? 0
                    );

                if ($initialDeposit > 0) {
                    MediatorDepositLog::create([
                        'mediator_id' =>
                            $mediator->id,

                        'admin_id' =>
                            auth()->id(),

                        'amount' =>
                            $initialDeposit,

                        'note' =>
                            'Nộp cọc ban đầu',

                        'recorded_at' =>
                            now()->toDateString(),
                    ]);
                }

                return $mediator;
            }
        );

        return response()->json([
            'message' =>
                'Đã tạo hồ sơ trung gian.',

            'data' =>
                $this->loadMediator(
                    $mediator
                ),
        ], 201);
    }

    public function show(
        Mediator $mediator
    ): JsonResponse {
        return response()->json([
            'data' =>
                $this->loadMediator(
                    $mediator
                ),
        ]);
    }

    public function update(
        Request $request,
        Mediator $mediator
    ): JsonResponse {
        $data =
            $this->validateData(
                $request
            );

        DB::transaction(
            function () use (
                $mediator,
                $data
            ) {
                $mediator->update([
                    'name' =>
                        $data['name'],

                    'description' =>
                        $data[
                            'description'
                        ] ?? null,

                    'status' =>
                        $data['status'],

                    'is_public' =>
                        $data[
                            'is_public'
                        ],

                    'admin_note' =>
                        $data[
                            'admin_note'
                        ] ?? null,
                ]);

                $this->syncIdentifiers(
                    $mediator,
                    $data[
                        'identifiers'
                    ] ?? []
                );
            }
        );

        return response()->json([
            'message' =>
                'Đã cập nhật hồ sơ trung gian.',

            'data' =>
                $this->loadMediator(
                    $mediator
                ),
        ]);
    }

    public function addDeposit(
        Request $request,
        Mediator $mediator
    ): JsonResponse {
        $data =
            $request->validate([
                'amount' => [
                    'required',
                    'integer',
                    'not_in:0',
                ],

                'note' => [
                    'nullable',
                    'string',
                    'max:500',
                ],

                'recorded_at' => [
                    'required',
                    'date',
                ],
            ]);

        $currentBalance =
            (int)
            $mediator
                ->depositLogs()
                ->sum('amount');

        $newBalance =
            $currentBalance +
            (int) $data['amount'];

        if ($newBalance < 0) {
            return response()->json([
                'message' =>
                    'Số dư tiền cọc không thể âm.',
            ], 422);
        }

        $mediator
            ->depositLogs()
            ->create([
                'admin_id' =>
                    $request
                        ->user()
                        ?->id,

                'amount' =>
                    (int)
                    $data['amount'],

                'note' =>
                    $data['note'] ??
                    null,

                'recorded_at' =>
                    $data[
                        'recorded_at'
                    ],
            ]);

        $mediator->touch();

        return response()->json([
            'message' =>
                'Đã cập nhật tiền cọc.',

            'data' =>
                $this->loadMediator(
                    $mediator
                ),
        ]);
    }

    private function validateData(
        Request $request
    ): array {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
            ],

            'description' => [
                'nullable',
                'string',
                'max:3000',
            ],

            'status' => [
                'required',
                Rule::in([
                    'active',
                    'suspended',
                    'removed',
                ]),
            ],

            'is_public' => [
                'required',
                'boolean',
            ],

            'admin_note' => [
                'nullable',
                'string',
                'max:3000',
            ],

            'initial_deposit' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'identifiers' => [
                'array',
                'max:30',
            ],

            'identifiers.*.type' => [
                'required',
                Rule::in([
                    'phone',
                    'bank_account',
                    'facebook',
                    'tiktok',
                    'instagram',
                    'zalo',
                    'telegram',
                    'other',
                ]),
            ],

            'identifiers.*.value' => [
                'required',
                'string',
                'max:500',
            ],

            'identifiers.*.label' => [
                'nullable',
                'string',
                'max:150',
            ],

            'identifiers.*.bank_id' => [
                'nullable',
                'integer',
                'exists:mediator_banks,id',
            ],

            'identifiers.*.bank_name' => [
                'nullable',
                'string',
                'max:150',
            ],

            'identifiers.*.account_holder' => [
                'nullable',
                'string',
                'max:150',
            ],

            'identifiers.*.is_public' => [
                'boolean',
            ],
        ]);
    }

    private function syncIdentifiers(
        Mediator $mediator,
        array $identifiers
    ): void {
        $mediator
            ->identifiers()
            ->delete();

        foreach ($identifiers as $item) {
            $value =
                trim($item['value']);

            MediatorIdentifier::create([
                'mediator_id' =>
                    $mediator->id,

                'type' =>
                    $item['type'],

                'value' =>
                    $value,

                'normalized_value' =>
                    $this->normalize(
                        $value
                    ),

                'bank_id' =>
                    $item['bank_id'] ??
                    null,

                'label' =>
                    $item['label'] ??
                    null,

                'bank_name' =>
                    $item[
                        'bank_name'
                    ] ?? null,

                'is_public' =>
                    $item[
                        'is_public'
                    ] ?? true,
            ]);
        }
    }

    private function loadMediator(
        Mediator $mediator
    ): Mediator {
        return $mediator
            ->fresh()
            ->load([
                'identifiers.bank',

                'depositLogs' =>
                    fn ($query) =>
                        $query
                            ->with(
                                'admin:id,name,email'
                            )
                            ->orderByDesc(
                                'recorded_at'
                            )
                            ->orderByDesc(
                                'id'
                            ),
            ])
            ->loadSum(
                'depositLogs as deposit_balance',
                'amount'
            );
    }

    private function nextCode(): string
    {
        $next =
            ((int)
                Mediator::query()
                    ->max('id')
            ) + 1;

        do {
            $code =
                'NS-TG-'.
                str_pad(
                    (string) $next,
                    4,
                    '0',
                    STR_PAD_LEFT
                );

            $exists =
                Mediator::query()
                    ->where(
                        'code',
                        $code
                    )
                    ->exists();

            $next++;
        } while ($exists);

        return $code;
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
