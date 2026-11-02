<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class HeaderSettingsController extends Controller
{
    private const DEFAULT_ITEMS = [
        ['key' => 'social', 'name' => 'Tăng tương tác', 'path' => '/', 'visible' => true],
        ['key' => 'exchange', 'name' => 'Tương tác chéo', 'path' => '/exchange', 'visible' => true],
        ['key' => 'search', 'name' => 'Kiểm tra lừa đảo', 'path' => '/search', 'visible' => true],
        ['key' => 'alerts', 'name' => 'Cảnh báo', 'path' => '/alerts', 'visible' => true],
        ['key' => 'community', 'name' => 'Cộng đồng', 'path' => '/community', 'visible' => true],
        ['key' => 'mediators', 'name' => 'Trung gian', 'path' => '/mediators', 'visible' => true],
        ['key' => 'digital', 'name' => 'Dịch vụ số', 'path' => '/digital-services', 'visible' => true],
        ['key' => 'guide', 'name' => 'Hướng dẫn', 'path' => '/guide', 'visible' => true],
    ];

    public function index(): JsonResponse
    {
        $saved = DB::table('header_settings')
            ->where('setting_key', 'navigation')
            ->value('setting_value');

        $items = $saved ? json_decode($saved, true) : null;

        return response()->json([
            'data' => $this->normalize(is_array($items) ? $items : self::DEFAULT_ITEMS),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'size:8'],
            'items.*.key' => ['required', 'string', Rule::in(array_column(self::DEFAULT_ITEMS, 'key'))],
            'items.*.visible' => ['required', 'boolean'],
        ]);

        $keys = array_column($validated['items'], 'key');

        if (count(array_unique($keys)) !== count(self::DEFAULT_ITEMS)) {
            return response()->json(['message' => 'Danh sách menu không hợp lệ.'], 422);
        }

        $items = $this->normalize($validated['items']);

        DB::table('header_settings')->updateOrInsert(
            ['setting_key' => 'navigation'],
            [
                'setting_value' => json_encode($items, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Đã lưu cấu hình Header.',
            'data' => $items,
        ]);
    }

    public function reset(): JsonResponse
    {
        DB::table('header_settings')
            ->where('setting_key', 'navigation')
            ->delete();

        return response()->json([
            'message' => 'Đã khôi phục Header mặc định.',
            'data' => self::DEFAULT_ITEMS,
        ]);
    }

    private function normalize(array $items): array
    {
        $defaults = collect(self::DEFAULT_ITEMS)->keyBy('key');
        $result = [];
        $seen = [];

        foreach ($items as $item) {
            $key = $item['key'] ?? null;

            if (!$key || !$defaults->has($key) || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $default = $defaults->get($key);
            $default['visible'] = ($item['visible'] ?? true) === true;
            $result[] = $default;
        }

        foreach (self::DEFAULT_ITEMS as $default) {
            if (!isset($seen[$default['key']])) {
                $result[] = $default;
            }
        }

        return $result;
    }
}
