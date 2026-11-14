<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminFinanceController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $from = $data['from'] ?? now()->startOfMonth()->toDateString();
        $to = $data['to'] ?? now()->toDateString();

        if ($from > $to) {
            throw ValidationException::withMessages([
                'to' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.',
            ]);
        }

        $start = Carbon::parse($from)->startOfDay();
        $end = Carbon::parse($to)->endOfDay();

        $transactions = DB::table('wallet_transactions')
            ->whereBetween('created_at', [$start, $end]);

        $wallet = (clone $transactions)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN `type` = 'deposit' AND `direction` = 'credit' THEN amount ELSE 0 END), 0) AS deposits,
                COALESCE(SUM(CASE WHEN `type` = 'order' AND `direction` = 'debit' THEN amount ELSE 0 END), 0) AS order_debits,
                COALESCE(SUM(CASE WHEN `type` = 'refund' AND `direction` = 'credit' THEN amount ELSE 0 END), 0) AS refunds,
                COALESCE(SUM(CASE WHEN `type` = 'adjustment' AND `direction` = 'credit' THEN amount ELSE 0 END), 0) AS adjustment_credits,
                COALESCE(SUM(CASE WHEN `type` = 'adjustment' AND `direction` = 'debit' THEN amount ELSE 0 END), 0) AS adjustment_debits
            ")
            ->first();

        $topups = DB::table('wallet_topups')
            ->whereBetween('created_at', [$start, $end]);

        $approvedTopups = (clone $topups)
            ->where('status', 'approved')
            ->selectRaw("
                COALESCE(SUM(CASE WHEN method = 'bank_transfer' THEN amount ELSE 0 END), 0) AS bank_transfer,
                COALESCE(SUM(CASE WHEN method = 'manual' THEN amount ELSE 0 END), 0) AS `manual`
            ")
            ->first();

        $orders = DB::table('social_orders')
            ->whereBetween('created_at', [$start, $end])
            ->whereIn('status', ['completed', 'partial']);

        $sales = (clone $orders)
            ->selectRaw("
                COUNT(*) AS order_count,
                COALESCE(SUM(sell_amount), 0) AS gross_sales,
                COALESCE(SUM(refunded_amount), 0) AS refunded_amount,
                COALESCE(SUM(GREATEST(sell_amount - refunded_amount, 0)), 0) AS net_sales,
                COALESCE(SUM(cost_amount), 0) AS recorded_cost
            ")
            ->first();

        $balance = DB::table('wallets')->sum('balance');

        $pendingTopups = DB::table('wallet_topups')
            ->where('status', 'pending')
            ->count();

        // Latest real top-up requests, independent of the selected reporting period.
        $recentTopups = DB::table('wallet_topups as t')
            ->leftJoin('users as u', 'u.id', '=', 't.user_id')
            ->select('t.id', 't.code', 't.user_id', 't.amount', 't.method',
                't.status', 't.bank_reference', 't.created_at',
                'u.username', 'u.name')
            ->orderByDesc('t.created_at')
            ->orderByDesc('t.id')
            ->paginate(10, ['*'], 'topups_page', max(1, (int) $request->query('topups_page', 1)));

        $netSales = (float) $sales->net_sales;
        $recordedCost = (float) $sales->recorded_cost;

        return response()->json([
            'data' => [
                'period' => ['from' => $from, 'to' => $to],
                'recent_topups' => $recentTopups->items(),
                'recent_topups_pagination' => [
                    'current_page' => $recentTopups->currentPage(),
                    'last_page' => $recentTopups->lastPage(),
                    'per_page' => $recentTopups->perPage(),
                    'total' => $recentTopups->total(),
                ],
                'wallet' => [
                    'deposits' => (float) $wallet->deposits,
                    'order_debits' => (float) $wallet->order_debits,
                    'refunds' => (float) $wallet->refunds,
                    'adjustment_credits' => (float) $wallet->adjustment_credits,
                    'adjustment_debits' => (float) $wallet->adjustment_debits,
                    'total_customer_balance' => (float) $balance,
                ],
                'topups' => [
                    'approved_bank_transfer' => (float) $approvedTopups->bank_transfer,
                    'approved_manual' => (float) $approvedTopups->manual,
                    'pending_count' => $pendingTopups,
                ],
                'social_orders' => [
                    'settled_count' => (int) $sales->order_count,
                    'gross_sales' => (float) $sales->gross_sales,
                    'refunded_amount' => (float) $sales->refunded_amount,
                    'net_sales' => $netSales,
                    'recorded_cost' => $recordedCost,
                    'estimated_gross_profit' => $netSales - $recordedCost,
                ],
                'notes' => [
                    'Topups and wallet transactions are separate views; do not add them together.',
                    'Order figures use order creation date, not settlement date.',
                    'Recorded cost is not verified provider expenditure.',
                    'Digital service costs and promotional bonuses are not yet included.',
                ],
            ],
        ]);
    }
}
