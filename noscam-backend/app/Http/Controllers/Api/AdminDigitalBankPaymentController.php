<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalOrder;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminDigitalBankPaymentController extends Controller
{
    public function confirm(
        Request $request,
        DigitalOrder $digitalOrder
    ): JsonResponse {
        abort_unless(
            $request->user()?->isAdmin(),
            403,
            'Chỉ Admin được xác nhận chuyển khoản.'
        );

        $data = $request->validate([
            'bank_reference' => [
                'required',
                'string',
                'max:255',
                'regex:/^[A-Za-z0-9][A-Za-z0-9._-]*$/',
            ],
            'note' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        $reference = strtoupper(trim($data['bank_reference']));

        try {
            $result = DB::transaction(function () use (
                $request,
                $digitalOrder,
                $data,
                $reference
            ) {
                $order = DigitalOrder::query()
                    ->whereKey($digitalOrder->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $order->payment_status !== 'unpaid' ||
                    $order->paid_at !== null ||
                    !in_array(
                        $order->status,
                        ['pending', 'processing'],
                        true
                    )
                ) {
                    throw ValidationException::withMessages([
                        'digital_order' =>
                            'Đơn không đủ điều kiện xác nhận thanh toán.',
                    ]);
                }

                $amount = (string) $order->amount_vnd;

                if (
                    !preg_match(
                        '/^[1-9][0-9]*(?:\.0{1,4})?$/',
                        $amount
                    )
                ) {
                    throw ValidationException::withMessages([
                        'amount_vnd' =>
                            'Số tiền thanh toán không hợp lệ.',
                    ]);
                }

                if ($order->pricing_type === 'quote') {
                    $accepted = $order->quotes()
                        ->where('status', 'accepted')
                        ->where('amount_vnd', $amount)
                        ->exists();

                    if (!$accepted) {
                        throw ValidationException::withMessages([
                            'digital_order' =>
                                'Đơn chưa có báo giá được chấp nhận.',
                        ]);
                    }
                }

                if (
                    DB::table('digital_order_payments')
                        ->where('bank_reference', $reference)
                        ->exists()
                ) {
                    throw ValidationException::withMessages([
                        'bank_reference' =>
                            'Mã giao dịch ngân hàng đã được sử dụng.',
                    ]);
                }

                DB::table('digital_order_payments')->insert([
                    'digital_order_id' => $order->id,
                    'method' => 'bank_transfer',
                    'amount_vnd' => $amount,
                    'status' => 'confirmed',
                    'bank_reference' => $reference,
                    'confirmed_by' => $request->user()->id,
                    'confirmed_at' => now(),
                    'note' => $data['note'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $order->payment_status = 'paid';
                $order->paid_at = now();
                $order->save();

                return $order->fresh();
            }, 3);
        } catch (QueryException $e) {
            // Ràng buộc UNIQUE trong database là lớp bảo vệ
            // cuối cùng nếu hai Admin xác nhận cùng một mã.
            $duplicate = DB::table('digital_order_payments')
                ->where('bank_reference', $reference)
                ->exists();

            if (!$duplicate) {
                throw $e;
            }

            throw ValidationException::withMessages([
                'bank_reference' =>
                    'Mã giao dịch ngân hàng đã được sử dụng.',
            ]);
        }

        return response()->json([
            'message' => 'Đã xác nhận thanh toán chuyển khoản.',
            'data' => $result,
        ]);
    }
}
