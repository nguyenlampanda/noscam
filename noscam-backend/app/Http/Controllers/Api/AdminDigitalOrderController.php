<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminDigitalOrderController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless(
            $request->user()?->isAdmin(),
            403,
            'Chỉ quản trị viên được truy cập đơn dịch vụ số.'
        );
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $filters = $request->validate([
            'status' => [
                'sometimes',
                Rule::in([
                    'pending',
                    'processing',
                    'in_progress',
                    'completed',
                    'cancelled',
                    'rejected',
                    'failed',
                ]),
            ],
            'payment_status' => [
                'sometimes',
                Rule::in([
                    'unpaid',
                    'pending',
                    'paid',
                    'refunded',
                ]),
            ],
            'search' => ['sometimes', 'string', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = DigitalOrder::query()
            ->with([
                'service:id,code,name,category,platform',
                'user:id,username',
            ]);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['payment_status'])) {
            $query->where(
                'payment_status',
                $filters['payment_status']
            );
        }

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);

            $query->where(function ($q) use ($search) {
                if (ctype_digit($search)) {
                    $q->whereKey((int) $search)
                        ->orWhere(
                            'guest_phone',
                            'like',
                            '%' . $search . '%'
                        );
                } else {
                    $q->whereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where(
                            'username',
                            'like',
                            '%' . $search . '%'
                        );
                    })
                    ->orWhere('guest_name', 'like', '%' . $search . '%')
                    ->orWhere('guest_phone', 'like', '%' . $search . '%')
                    ->orWhere('guest_email', 'like', '%' . $search . '%')
                    ->orWhereHas(
                        'service',
                        function ($serviceQuery) use ($search) {
                            $serviceQuery->where(
                                'name',
                                'like',
                                '%' . $search . '%'
                            );
                        }
                    );
                }
            });
        }

        return response()->json(
            $query->orderByDesc('id')->paginate(30)
        );
    }

    public function show(
        Request $request,
        DigitalOrder $digitalOrder
    ): JsonResponse {
        $this->authorizeAdmin($request);

        $digitalOrder->load([
            'service:id,code,name,category,platform',
            'user:id,username',
        ]);

        $history = DB::table('digital_order_status_histories')
            ->leftJoin(
                'users',
                'users.id',
                '=',
                'digital_order_status_histories.admin_user_id'
            )
            ->where(
                'digital_order_status_histories.digital_order_id',
                $digitalOrder->id
            )
            ->orderByDesc('digital_order_status_histories.id')
            ->select([
                'digital_order_status_histories.id',
                'digital_order_status_histories.old_status',
                'digital_order_status_histories.new_status',
                'digital_order_status_histories.note',
                'digital_order_status_histories.created_at',
                'users.username as admin_username',
            ])
            ->get();

        $payments = DB::table('digital_order_payments')
            ->leftJoin('users', 'users.id', '=', 'digital_order_payments.confirmed_by')
            ->where('digital_order_payments.digital_order_id', $digitalOrder->id)
            ->where('digital_order_payments.method', 'bank_transfer')
            ->orderByDesc('digital_order_payments.id')
            ->select([
                'digital_order_payments.id',
                'digital_order_payments.method',
                'digital_order_payments.amount_vnd',
                'digital_order_payments.status',
                'digital_order_payments.bank_reference',
                'digital_order_payments.confirmed_at',
                'digital_order_payments.note',
                'users.username as confirmed_by_username',
            ])
            ->get();

        return response()->json([
            'data' => $digitalOrder,
            'history' => $history,
            'payments' => $payments,
            'quotes' => $digitalOrder->quotes()
                ->orderByDesc('id')
                ->get(),
        ]);
    }


    public function createQuote(
        Request $request,
        DigitalOrder $digitalOrder
    ): JsonResponse {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'amount_vnd' => [
                'required',
                'numeric',
                'gt:0',
                'decimal:0,4',
                'max:99999999999999',
            ],
            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],
            'expires_at' => [
                'nullable',
                'date',
                'after:now',
            ],
        ]);

        $quote = DB::transaction(function () use (
            $request,
            $digitalOrder,
            $validated
        ) {
            $order = DigitalOrder::query()
                ->whereKey($digitalOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $order->pricing_type !== 'quote' ||
                $order->status !== 'pending' ||
                $order->payment_status !== 'unpaid'
            ) {
                throw ValidationException::withMessages([
                    'digital_order' =>
                        'Đơn hàng không đủ điều kiện nhận báo giá.',
                ]);
            }

            $hasPending = $order->quotes()
                ->where('status', 'pending')
                ->exists();

            if ($hasPending) {
                throw ValidationException::withMessages([
                    'digital_order' =>
                        'Đơn hàng đang có báo giá chờ phản hồi.',
                ]);
            }

            $quote = new \App\Models\DigitalQuote();
            $quote->digital_order_id = $order->id;
            $quote->admin_id = $request->user()->id;
            $quote->amount_vnd = $validated['amount_vnd'];
            $quote->description = $validated['description'] ?? null;
            $quote->status = 'pending';
            $quote->expires_at = $validated['expires_at'] ?? null;
            $quote->accepted_at = null;
            $quote->save();

            return $quote;
        });

        return response()->json([
            'message' => 'Đã gửi báo giá.',
            'data' => $quote,
        ], 201);
    }

    public function updateStatus(
        Request $request,
        DigitalOrder $digitalOrder
    ): JsonResponse {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'processing',
                    'completed',
                    'cancelled',
                ]),
            ],
            'note' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ]);

        $order = DB::transaction(function () use (
            $request,
            $digitalOrder,
            $validated
        ) {
            $order = DigitalOrder::query()
                ->whereKey($digitalOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $oldStatus = $order->status;
            $newStatus = $validated['status'];

            $allowed = [
                'pending' => [
                    'processing',
                    'cancelled',
                ],
                'processing' => [
                    'completed',
                    'cancelled',
                ],
            ];

            if (!in_array(
                $newStatus,
                $allowed[$oldStatus] ?? [],
                true
            )) {
                throw ValidationException::withMessages([
                    'status' =>
                        'Không thể chuyển trạng thái từ '
                        . $oldStatus . ' sang ' . $newStatus . '.',
                ]);
            }

            if (
                $newStatus === 'completed' &&
                $order->payment_status !== 'paid'
            ) {
                throw ValidationException::withMessages([
                    'status' =>
                        'Đơn chưa thanh toán không thể hoàn thành.',
                ]);
            }

            $order->status = $newStatus;

            if ($newStatus === 'completed') {
                $order->completed_at = now();
            }

            $order->save();

            DB::table('digital_order_status_histories')->insert([
                'digital_order_id' => $order->id,
                'admin_user_id' => $request->user()->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'note' => $validated['note'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $order;
        });

        $order->load([
            'service:id,code,name,category,platform',
            'user:id,username',
        ]);

        return response()->json([
            'message' => 'Đã cập nhật trạng thái đơn.',
            'data' => $order,
        ]);
    }

}
