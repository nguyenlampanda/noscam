<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use App\Models\Report;
use App\Models\SocialOrder;
use App\Models\SocialProvider;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);
        $from = $validated['from'] ?? now()->startOfMonth()->toDateString();
        $to = $validated['to'] ?? now()->toDateString();
        if ($from > $to) {
            throw ValidationException::withMessages(['to' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.']);
        }
        if (Carbon::parse($from)->diffInDays(Carbon::parse($to)) > 3660) {
            throw ValidationException::withMessages(['to' => 'Khoảng thống kê tối đa 10 năm.']);
        }
        $start = Carbon::parse($from)->startOfDay();
        $end = Carbon::parse($to)->endOfDay();

        // Hide NganHangSub only from this dashboard. Never delete provider or orders.
        $excludedProviderIds = SocialProvider::query()->get(['id', 'name', 'slug'])
            ->filter(function ($provider) {
                $slug = mb_strtolower((string) $provider->slug);
                $name = preg_replace('/[^a-z0-9]/', '', mb_strtolower((string) $provider->name));
                return str_contains($slug, 'nganhangsub') || str_contains($name, 'nganhangsub');
            })->pluck('id')->all();

        // Revenue is net of refunds; completed/partial only. Other orders are pending reconciliation.
        $settled = SocialOrder::query()->whereBetween('created_at', [$start, $end])
            ->whereNotIn('social_provider_id', $excludedProviderIds)
            ->whereIn('status', ['completed', 'partial']);
        $summary = (clone $settled)->selectRaw('COUNT(*) as order_count, COALESCE(SUM(GREATEST(sell_amount - refunded_amount, 0)), 0) as revenue, COALESCE(SUM(cost_amount), 0) as cost')->first();
        $revenue = (float) $summary->revenue;
        $cost = (float) $summary->cost;
        $providers = SocialProvider::query()->whereNotIn('id', $excludedProviderIds)->orderBy('name')->get(['id', 'name', 'slug']);
        $byProvider = (clone $settled)->select('social_provider_id')
            ->selectRaw('COUNT(*) as order_count, COALESCE(SUM(GREATEST(sell_amount - refunded_amount, 0)), 0) as revenue, COALESCE(SUM(cost_amount), 0) as cost')
            ->groupBy('social_provider_id')->get()->keyBy('social_provider_id');
        $providerRows = $providers->map(function ($provider) use ($byProvider) {
            $row = $byProvider->get($provider->id);
            return [
                'id' => $provider->id,
                'name' => $provider->name,
                'slug' => $provider->slug,
                'orders' => (int) ($row->order_count ?? 0),
                'revenue' => (float) ($row->revenue ?? 0),
                'cost' => (float) ($row->cost ?? 0),
            ];
        })->values();
        $unassigned = $byProvider->get('') ?? $byProvider->get(null);
        if ($unassigned && (int) $unassigned->order_count > 0) {
            $providerRows->push(['id' => null, 'name' => 'Chưa xác định API', 'slug' => null, 'orders' => (int) $unassigned->order_count, 'revenue' => (float) $unassigned->revenue, 'cost' => (float) $unassigned->cost]);
        }
        $pendingCount = SocialOrder::query()->whereBetween('created_at', [$start, $end])
            ->whereNotIn('social_provider_id', $excludedProviderIds)
            ->whereNotIn('status', ['completed', 'partial', 'cancelled', 'failed'])->count();
        $chart = (clone $settled)->selectRaw('DATE(created_at) as day, COALESCE(SUM(GREATEST(sell_amount - refunded_amount, 0)), 0) as revenue, COALESCE(SUM(cost_amount), 0) as cost')
            ->groupBy(DB::raw('DATE(created_at)'))->orderBy('day')->get()
            ->map(fn ($row) => ['day' => $row->day, 'revenue' => (float) $row->revenue, 'cost' => (float) $row->cost]);


        // NOSCAM_REAL_OPERATIONS_V1
        // Read-only operational counters. Financial calculations stay unchanged.
        $safeCount = function (string $table, ?string $column = null, ?array $statuses = null): ?int {
            if (!\Illuminate\Support\Facades\Schema::hasTable($table)) {
                return null;
            }

            $query = DB::table($table);

            if ($column !== null) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn($table, $column)) {
                    return null;
                }

                $query->whereIn($column, $statuses ?? []);
            }

            return $query->count();
        };

        $operations = [
            'reports_pending' => $safeCount('reports', 'status', ['pending']),
            'social_pending' => $safeCount(
                'social_orders',
                'status',
                ['pending', 'processing', 'in_progress']
            ),
            'social_failed' => $safeCount(
                'social_orders',
                'status',
                ['failed']
            ),
            'topups_pending' => $safeCount(
                'wallet_topups',
                'status',
                ['pending']
            ),
            'exchange_disputes_open' => $safeCount(
                'exchange_task_disputes',
                'status',
                ['pending', 'open']
            ),
            'community_posts_pending' => $safeCount(
                'community_posts',
                'status',
                ['pending']
            ),
            'community_comments_pending' => $safeCount(
                'community_comments',
                'status',
                ['pending']
            ),
            'digital_orders_pending' => $safeCount(
                'digital_orders',
                'status',
                ['pending', 'processing']
            ),
            'users_total' => $safeCount('users'),
            'exchange_campaigns_paused' => $safeCount(
                'exchange_campaigns',
                'status',
                ['paused']
            ),
            'exchange_campaigns_total' => $safeCount('exchange_campaigns'),
            'digital_orders_total' => $safeCount('digital_orders'),
            'mediators_total' => $safeCount('mediators'),
            'chat_conversations_total' => $safeCount('chat_conversations'),
            'community_posts_total' => $safeCount('community_posts'),
        ];

        return response()->json(['data' => [
            'operations' => $operations,
            'reports' => [
                'total' => Report::count(),
                'pending' => Report::where('status', 'pending')->count(),
                'approved' => Report::where('status', 'approved')->count(),
                'rejected' => Report::where('status', 'rejected')->count(),
            ],
            'entities' => [
                'total' => Entity::count(),
                'public_alerts' => Entity::query()->where('is_active', true)->where('report_count', '>', 0)->count(),
            ],
            'finance' => [
                'from' => $from,
                'to' => $to,
                'orders' => (int) $summary->order_count,
                'pending_orders' => $pendingCount,
                'revenue' => $revenue,
                'cost' => $cost,
                'profit' => $revenue - $cost,
                'providers' => $providerRows,
                'daily' => $chart,
                'basis' => 'completed_partial_created_at',
            ],
        ]]);
    }
}
