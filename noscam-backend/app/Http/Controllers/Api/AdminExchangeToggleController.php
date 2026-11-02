<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeTaskPrice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminExchangeToggleController extends Controller
{
    private const PLATFORMS = [
        'instagram' => ['follow', 'like', 'comment'],
        'tiktok' => ['follow', 'like', 'comment', 'view', 'share'],
        'facebook' => ['follow', 'like', 'comment', 'share'],
        'youtube' => ['subscribe', 'like', 'comment', 'view'],
        'threads' => ['follow', 'like', 'comment', 'repost'],
        'twitter' => ['follow', 'like', 'repost', 'comment'],
        'telegram' => ['join', 'view', 'reaction'],
        'zalo' => ['follow', 'like', 'share'],
        'pinterest' => ['follow', 'save'],
        'linkedin' => ['follow', 'like', 'comment'],
        'reddit' => ['join', 'upvote', 'comment'],
    ];

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $settings = DB::table('exchange_toggle_settings')->get();
        $prices = ExchangeTaskPrice::query()->get();
        $result = [];

        foreach (self::PLATFORMS as $platform => $tasks) {
            $legacy = in_array($platform, [
                'instagram', 'tiktok', 'facebook'
            ], true);

            $platformSetting = $settings->first(
                fn ($item) =>
                    $item->platform === $platform &&
                    $item->task_type === '__platform__'
            );

            $platformEnabled = $platformSetting
                ? (bool) $platformSetting->is_enabled
                : $legacy;

            $services = [];

            foreach ($tasks as $task) {
                $setting = $settings->first(
                    fn ($item) =>
                        $item->platform === $platform &&
                        $item->task_type === $task
                );

                $price = $prices->first(
                    fn ($item) =>
                        $item->platform === $platform &&
                        $item->task_type === $task
                );

                $supported = $legacy &&
                    in_array($task, ['follow', 'like', 'comment'], true);

                $enabled = $setting
                    ? (bool) $setting->is_enabled
                    : ($supported && $price
                        ? (bool) $price->is_enabled
                        : false);

                $services[] = [
                    'task_type' => $task,
                    'is_enabled' => $enabled,
                    'backend_supported' => $supported,
                ];
            }

            $result[] = [
                'platform' => $platform,
                'is_enabled' => $platformEnabled,
                'services' => $services,
            ];
        }

        return response()->json(['data' => $result]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $data = $request->validate([
            'platform' => [
                'required', 'string',
                Rule::in(array_keys(self::PLATFORMS)),
            ],
            'task_type' => ['required', 'string', 'max:40'],
            'is_enabled' => ['required', 'boolean'],
        ]);

        $platform = $data['platform'];
        $task = $data['task_type'];

        if (
            $task !== '__platform__' &&
            !in_array($task, self::PLATFORMS[$platform], true)
        ) {
            return response()->json([
                'message' => 'Loại tương tác không hợp lệ.',
            ], 422);
        }

        DB::table('exchange_toggle_settings')->updateOrInsert(
            [
                'platform' => $platform,
                'task_type' => $task,
            ],
            [
                'is_enabled' => $data['is_enabled'],
                'updated_by' => $request->user()->id,
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Đã lưu trạng thái.',
            'data' => [
                'platform' => $platform,
                'task_type' => $task,
                'is_enabled' => (bool) $data['is_enabled'],
            ],
        ]);
    }
}
