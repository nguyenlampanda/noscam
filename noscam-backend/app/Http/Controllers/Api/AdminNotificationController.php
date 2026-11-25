<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminNotificationController extends Controller
{
    private const SOURCES = [
        'orders' => [
            ['social_orders', ['pending', 'processing', 'in_progress', 'failed']],
        ],
        'finance' => [
            ['wallet_topups', ['pending']],
        ],
        'exchange' => [
            ['exchange_task_disputes', ['pending', 'open']],
            ['exchange_campaigns', ['paused']],
        ],
        'reports' => [
            ['reports', ['pending']],
        ],
        'community' => [
            ['community_posts', ['pending']],
            ['community_comments', ['pending']],
        ],
        'digital_orders' => [
            ['digital_orders', ['pending', 'processing']],
        ],
    ];

    private function items(string $section): array
    {
        $items = [];

        foreach (self::SOURCES[$section] as [$table, $statuses]) {
            if (!Schema::hasTable($table)
                || !Schema::hasColumns($table, ['id', 'status'])) {
                continue;
            }

            $ids = DB::table($table)
                ->whereIn('status', $statuses)
                ->pluck('id');

            foreach ($ids as $id) {
                $items[] = $table . ':' . $id;
            }
        }

        return $items;
    }

    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $counts = [];
        $unreadOrders = [];

        foreach (array_keys(self::SOURCES) as $section) {
            $items = $this->items($section);

            $reads = DB::table('admin_notification_reads')
                ->where('user_id', $userId)
                ->where('section', $section)
                ->pluck('item_key')
                ->all();

            $unread = array_values(array_diff($items, $reads));
            $counts[$section] = count($unread);

            if ($section === 'orders') {
                $unreadOrders = $unread;
            }
        }

        return response()->json([
            'data' => array_merge($counts, [
                'unread_orders' => $unreadOrders,
            ]),
        ]);
    }

    public function markRead(Request $request)
    {
        $data = $request->validate([
            'section' => [
                'required',
                'string',
                \Illuminate\Validation\Rule::in(array_keys(self::SOURCES)),
            ],
        ]);

        $request->validate([
            'order_id' => ['sometimes', 'required', 'integer', 'min:1'],
        ]);

        $section = $data['section'];
        $userId = $request->user()->id;
        $now = now();

        $reads = DB::table('admin_notification_reads')
            ->where('user_id', $userId)
            ->where('section', $section)
            ->pluck('item_key')
            ->all();

        $unreadItems = array_values(
            array_diff($this->items($section), $reads)
        );

        if ($request->has('order_id')) {
            abort_unless($section === 'orders', 422);

            $unreadItems = array_values(array_intersect(
                $unreadItems,
                ['social_orders:' . (int) $request->input('order_id')]
            ));
        }

        foreach (array_chunk($unreadItems, 500) as $items) {
            $rows = array_map(fn ($key) => [
                'user_id' => $userId,
                'section' => $section,
                'item_key' => $key,
                'read_at' => $now,
            ], $items);

            DB::table('admin_notification_reads')->insertOrIgnore($rows);
        }

        return response()->json([
            'success' => true,
            'section' => $section,
            'unread_items' => $unreadItems,
        ]);
    }
}
