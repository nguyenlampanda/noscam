<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeSocialAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExchangeSocialAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => ExchangeSocialAccount::query()
                ->where('user_id', $request->user()->id)
                ->orderBy('platform')
                ->orderByDesc('is_default')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'platform' => [
                'required',
                Rule::in(['instagram', 'tiktok', 'facebook']),
            ],
            'account' => ['required', 'string', 'max:2048'],
        ]);

        $platform = $data['platform'];
        $input = trim($data['account']);

        if ($platform === 'instagram' || $platform === 'tiktok') {
            $value = $input;

            if (preg_match('~^https?://~i', $input)) {
                $parts = parse_url($input);
                $host = strtolower($parts['host'] ?? '');

                $allowed = $platform === 'instagram'
                    ? ['instagram.com', 'www.instagram.com']
                    : ['tiktok.com', 'www.tiktok.com'];

                if (!in_array($host, $allowed, true)) {
                    throw ValidationException::withMessages([
                        'account' => 'Liên kết không đúng nền tảng.',
                    ]);
                }

                $segments = explode(
                    '/',
                    trim($parts['path'] ?? '', '/')
                );

                $value = $segments[0] ?? '';

                if ($platform === 'tiktok') {
                    $value = ltrim($value, '@');
                }
            }

            $username = ltrim($value, '@');

            $pattern = $platform === 'instagram'
                ? '/^[A-Za-z0-9._]{1,30}$/'
                : '/^[A-Za-z0-9._]{2,24}$/';

            if (!preg_match($pattern, $username)) {
                throw ValidationException::withMessages([
                    'account' => 'Username không hợp lệ.',
                ]);
            }

            $normalized = strtolower($username);

            $url = $platform === 'instagram'
                ? "https://www.instagram.com/{$normalized}/"
                : "https://www.tiktok.com/@{$normalized}";
        } else {
            $parts = parse_url($input);
            $host = strtolower($parts['host'] ?? '');

            if (!in_array($host, [
                'facebook.com',
                'www.facebook.com',
                'm.facebook.com',
                'web.facebook.com',
                'fb.com',
                'www.fb.com',
            ], true)) {
                throw ValidationException::withMessages([
                    'account' => 'Vui lòng nhập liên kết Facebook hợp lệ.',
                ]);
            }

            $path = trim($parts['path'] ?? '', '/');

            if ($path === '' || str_contains($path, '..')) {
                throw ValidationException::withMessages([
                    'account' => 'Liên kết Facebook không hợp lệ.',
                ]);
            }

            $username = $path;
            $normalized = strtolower($path);

            if (strtolower(basename($path)) === 'profile.php') {
                $query = [];
                parse_str($parts['query'] ?? '', $query);

                if (!preg_match('/^[0-9]+$/', $query['id'] ?? '')) {
                    throw ValidationException::withMessages([
                        'account' => 'Facebook profile thiếu ID hợp lệ.',
                    ]);
                }

                $username = 'profile.php?id='.$query['id'];
                $normalized = $username;
            }

            $url = 'https://www.facebook.com/'.$username;

            if (strlen($normalized) > 191) {
                throw ValidationException::withMessages([
                    'account' => 'Liên kết Facebook quá dài.',
                ]);
            }
        }

        $account = DB::transaction(function () use (
            $request,
            $platform,
            $username,
            $normalized,
            $url
        ) {
            $existing = ExchangeSocialAccount::query()
                ->where('platform', $platform)
                ->where('normalized_username', $normalized)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                if ((int) $existing->user_id !== (int) $request->user()->id) {
                    throw ValidationException::withMessages([
                        'account' => 'Tài khoản này đã được đăng ký.',
                    ]);
                }

                if ($existing->is_active) {
                    throw ValidationException::withMessages([
                        'account' => 'Bạn đã lưu tài khoản này.',
                    ]);
                }

                $existing->update(['is_active' => true]);

                return $existing;
            }

            $hasDefault = ExchangeSocialAccount::query()
                ->where('user_id', $request->user()->id)
                ->where('platform', $platform)
                ->where('is_default', true)
                ->exists();

            return ExchangeSocialAccount::create([
                'user_id' => $request->user()->id,
                'platform' => $platform,
                'username' => $username,
                'normalized_username' => $normalized,
                'profile_url' => $url,
                'is_default' => !$hasDefault,
                'is_active' => true,
            ]);
        });

        return response()->json(['data' => $account], 201);
    }

    public function setDefault(Request $request, int $id): JsonResponse
    {
        $account = DB::transaction(function () use ($request, $id) {
            $account = ExchangeSocialAccount::query()
                ->where('user_id', $request->user()->id)
                ->where('is_active', true)
                ->findOrFail($id);

            ExchangeSocialAccount::query()
                ->where('user_id', $request->user()->id)
                ->where('platform', $account->platform)
                ->update(['is_default' => false]);

            $account->update(['is_default' => true]);

            return $account;
        });

        return response()->json(['data' => $account]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        DB::transaction(function () use ($request, $id) {
            $userId = $request->user()->id;

            // Serialize account changes for this user.
            $request->user()->newQuery()
                ->whereKey($userId)
                ->lockForUpdate()
                ->firstOrFail();

            $account = ExchangeSocialAccount::query()
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->findOrFail($id);

            $wasDefault = $account->is_default;

            $account->update([
                'is_active' => false,
                'is_default' => false,
            ]);

            if ($wasDefault) {
                $replacement = ExchangeSocialAccount::query()
                    ->where('user_id', $userId)
                    ->where('platform', $account->platform)
                    ->where('is_active', true)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->first();

                if ($replacement) {
                    $replacement->update(['is_default' => true]);
                }
            }
        });

        return response()->json([
            'message' => 'Đã ngừng sử dụng tài khoản.',
        ]);
    }
}
