<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalOrder;
use App\Services\Social\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class DigitalOrderPaymentController extends Controller
{
    public function payWithWallet(
        Request $request,
        DigitalOrder $digitalOrder,
        WalletService $walletService
    ): JsonResponse {
        abort_unless(
            (int) $digitalOrder->user_id ===
            (int) $request->user()->id,
            404
        );

        $order = DB::transaction(function () use (
            $request,
            $digitalOrder,
            $walletService
        ) {
            $locked = DigitalOrder::query()
                ->whereKey($digitalOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $locked->payment_status !== 'unpaid' ||
                $locked->paid_at !== null ||
                !in_array(
                    $locked->status,
                    ['pending', 'processing'],
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    'payment' => 'Đơn hàng không thể thanh toán.',
                ]);
            }

            $amount = (string) $locked->amount_vnd;

            if (
                !preg_match('/^[1-9][0-9]*(?:\.0{1,4})?$/', $amount)
            ) {
                throw ValidationException::withMessages([
                    'payment' => 'Đơn hàng chưa có giá hợp lệ.',
                ]);
            }

            if (
                $locked->pricing_type === 'quote' &&
                !$locked->quotes()
                    ->where('status', 'accepted')
                    ->where('amount_vnd', $locked->amount_vnd)
                    ->exists()
            ) {
                throw ValidationException::withMessages([
                    'payment' => 'Báo giá chưa được chấp nhận.',
                ]);
            }

            try {
                $walletService->debit(
                    user: $request->user(),
                    amount: (float) $amount,
                    type: 'order',
                    referenceType: DigitalOrder::class,
                    referenceId: $locked->id,
                    description: 'Thanh toán đơn dịch vụ số #' . $locked->id,
                    meta: [
                        'source' => 'digital_order',
                        'payment_method' => 'wallet',
                    ]
                );
            } catch (RuntimeException $e) {
                if (in_array($e->getMessage(), [
                    'Số dư không đủ.',
                    'Ví chưa được khởi tạo.',
                ], true)) {
                    throw ValidationException::withMessages([
                        'payment' => $e->getMessage(),
                    ]);
                }

                throw $e;
            }

            $locked->payment_status = 'paid';
            $locked->paid_at = now();
            $locked->save();

            return $locked;
        }, 3);

        return response()->json([
            'message' => 'Thanh toán bằng ví thành công.',
            'data' => $order,
        ]);
    }
}
