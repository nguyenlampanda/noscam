<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WalletTopup;
use App\Services\Social\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WalletController extends Controller
{
    public function show(
        Request $request,
        WalletService $walletService
    ): JsonResponse {
        $wallet =
            $walletService->getOrCreate(
                $request->user()
            );

        return response()->json([
            'data' => [
                'balance' =>
                    $wallet->balance,
                'currency' =>
                    $wallet->currency,
                'total_deposited' =>
                    $wallet->total_deposited,
                'total_spent' =>
                    $wallet->total_spent,
                'total_refunded' =>
                    $wallet->total_refunded,
            ],
        ]);
    }

    public function transactions(
        Request $request,
        WalletService $walletService
    ): JsonResponse {
        $wallet =
            $walletService->getOrCreate(
                $request->user()
            );

        return response()->json(
            $wallet
                ->transactions()
                ->latest()
                ->paginate(30)
        );
    }

    public function topups(
        Request $request
    ): JsonResponse {
        return response()->json(
            WalletTopup::query()
                ->where(
                    'user_id',
                    $request->user()->id
                )
                ->latest()
                ->paginate(30)
        );
    }

    public function createTopup(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'amount' => [
                'required',
                'numeric',
                'min:10000',
                'max:100000000',
            ],
            'bank_reference' => [
                'nullable',
                'string',
                'max:255',
            ],
            'note' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

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

        $topup = WalletTopup::create([
            'code' =>
                $code,
            'user_id' =>
                $request->user()->id,
            'amount' =>
                $data['amount'],
            'method' =>
                'bank_transfer',
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
                $topup,
        ], 201);
    }
}
