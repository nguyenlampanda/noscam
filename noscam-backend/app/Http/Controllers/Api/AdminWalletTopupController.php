<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalletTopup;
use App\Services\Social\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class AdminWalletTopupController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $query = WalletTopup::query()
            ->with([
                'user:id,name,email',
            ]);

        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->string('status')
            );
        }

        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input(
                    'search'
                )
            );

            $query->where(
                function ($q) use ($search) {
                    $q->where(
                        'code',
                        'like',
                        "%{$search}%"
                    )->orWhere(
                        'bank_reference',
                        'like',
                        "%{$search}%"
                    )->orWhereHas(
                        'user',
                        function ($userQuery)
                        use ($search) {
                            $userQuery
                                ->where(
                                    'email',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhere(
                                    'name',
                                    'like',
                                    "%{$search}%"
                                );
                        }
                    );
                }
            );
        }

        return response()->json(
            $query
                ->latest()
                ->paginate(50)
        );
    }

    public function store(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'user_id' => [
                'required',
                'integer',
                'exists:users,id',
            ],
            'amount' => [
                'required',
                'numeric',
                'min:1',
            ],
            'method' => [
                'nullable',
                'in:bank_transfer,manual',
            ],
            'bank_reference' => [
                'nullable',
                'string',
                'max:255',
            ],
            'note' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        $topup = WalletTopup::create([
            'code' =>
                $this->topupCode(),

            'user_id' =>
                $data['user_id'],

            'amount' =>
                $data['amount'],

            'method' =>
                $data['method']
                ?? 'manual',

            'status' =>
                'pending',

            'bank_reference' =>
                $data['bank_reference']
                ?? null,

            'note' =>
                $data['note']
                ?? null,
        ]);

        return response()->json([
            'message' =>
                'Đã tạo yêu cầu nạp tiền.',
            'data' =>
                $topup->load(
                    'user:id,name,email'
                ),
        ], 201);
    }

    public function approve(
        Request $request,
        WalletTopup $topup,
        WalletService $walletService
    ): JsonResponse {
        $result = DB::transaction(
            function () use (
                $request,
                $topup,
                $walletService
            ) {
                $locked =
                    WalletTopup::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $topup->id
                        );

                if (
                    $locked->status ===
                    'approved'
                ) {
                    return $locked;
                }

                if (
                    $locked->status !==
                    'pending'
                ) {
                    throw new RuntimeException(
                        'Chỉ có thể duyệt yêu cầu đang chờ.'
                    );
                }

                $walletService->credit(
                    user:
                        $locked->user,
                    amount:
                        (float)
                        $locked->amount,
                    type:
                        'deposit',
                    referenceType:
                        WalletTopup::class,
                    referenceId:
                        $locked->id,
                    description:
                        'Nạp tiền '
                        .$locked->code,
                    createdBy:
                        $request->user()?->id,
                    meta: [
                        'topup_code' =>
                            $locked->code,
                    ]
                );

                $locked->update([
                    'status' =>
                        'approved',
                    'reviewed_by' =>
                        $request->user()?->id,
                    'reviewed_at' =>
                        now(),
                ]);

                return $locked
                    ->fresh()
                    ->load(
                        'user:id,name,email'
                    );
            },
            3
        );

        return response()->json([
            'message' =>
                'Đã duyệt và cộng tiền vào ví.',
            'data' =>
                $result,
        ]);
    }

    public function reject(
        Request $request,
        WalletTopup $topup
    ): JsonResponse {
        $data = $request->validate([
            'note' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        $topup = DB::transaction(
            function () use (
                $request,
                $topup,
                $data
            ) {
                $locked =
                    WalletTopup::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $topup->id
                        );

                if (
                    $locked->status !==
                    'pending'
                ) {
                    throw new RuntimeException(
                        'Chỉ có thể từ chối yêu cầu đang chờ.'
                    );
                }

                $locked->update([
                    'status' =>
                        'rejected',
                    'reviewed_by' =>
                        $request->user()?->id,
                    'reviewed_at' =>
                        now(),
                    'note' =>
                        $data['note']
                        ?? $locked->note,
                ]);

                return $locked->fresh();
            },
            3
        );

        return response()->json([
            'message' =>
                'Đã từ chối yêu cầu nạp tiền.',
            'data' =>
                $topup,
        ]);
    }

    private function topupCode(): string
    {
        do {
            $code = 'TP-'
                .now()->format('YmdHis')
                .'-'
                .Str::upper(
                    Str::random(6)
                );
        } while (
            WalletTopup::where(
                'code',
                $code
            )->exists()
        );

        return $code;
    }
}
