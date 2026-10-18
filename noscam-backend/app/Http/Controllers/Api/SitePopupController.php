<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SitePopupController extends Controller
{
    private const PAGES = [
        '/', '/search', '/community', '/report',
        '/alerts', '/mediators', '/guide', '/about',
        '/social-services', '/digital-services', '/exchange',
    ];

    private function admin(Request $request): void
    {
        $user = $request->user();

        abort_unless(
            $user && in_array(
                $user->role,
                ['admin', 'super_admin'],
                true
            ),
            403,
            'Chỉ Admin mới có quyền quản lý popup.'
        );
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'content' => ['required', 'string', 'max:10000'],
            'pages' => ['required', 'array', 'min:1'],
            'pages.*' => [
                'required', 'string', 'distinct',
                Rule::in(self::PAGES),
            ],
            'image_url' => [
                'nullable', 'url:http,https', 'max:2048',
            ],
            'button_text' => [
                'nullable', 'string', 'max:100',
            ],
            'button_url' => [
                'nullable', 'url:http,https', 'max:2048',
            ],
            'is_active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => [
                'nullable', 'date', 'after:starts_at',
            ],
        ];
    }

    private function normalize(array $data): array
    {
        foreach ([
            'image_url', 'button_text', 'button_url',
            'starts_at', 'ends_at',
        ] as $field) {
            $data[$field] = $data[$field] ?? null;
        }

        $data['pages'] = json_encode(
            array_values($data['pages']),
            JSON_UNESCAPED_UNICODE
        );

        return $data;
    }

    private function output(object $popup): array
    {
        return [
            'id' => $popup->id,
            'title' => $popup->title,
            'content' => $popup->content,
            'pages' => json_decode($popup->pages, true) ?: [],
            'image_url' => $popup->image_url,
            'button_text' => $popup->button_text,
            'button_url' => $popup->button_url,
            'is_active' => (bool) $popup->is_active,
            'version' => (int) $popup->version,
            'starts_at' => $popup->starts_at,
            'ends_at' => $popup->ends_at,
            'created_at' => $popup->created_at,
            'updated_at' => $popup->updated_at,
        ];
    }

    public function publicIndex(Request $request): JsonResponse
    {
        $data = $request->validate([
            'page' => [
                'required', 'string', Rule::in(self::PAGES),
            ],
        ]);

        $now = now();

        $popups = DB::table('site_popups')
            ->where('is_active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', $now);
            })
            ->orderBy('id')
            ->get()
            ->filter(function ($popup) use ($data) {
                $pages = json_decode($popup->pages, true);
                return is_array($pages)
                    && in_array($data['page'], $pages, true);
            })
            ->map(fn ($popup) => $this->output($popup))
            ->values();

        return response()->json(['data' => $popups]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->admin($request);

        $popups = DB::table('site_popups')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($popup) => $this->output($popup));

        return response()->json(['data' => $popups]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->admin($request);
        $data = $this->normalize(
            $request->validate($this->rules())
        );

        $id = DB::table('site_popups')->insertGetId([
            ...$data,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'data' => $this->output(
                DB::table('site_popups')->find($id)
            ),
        ], 201);
    }

    public function update(
        Request $request,
        int $popup
    ): JsonResponse {
        $this->admin($request);

        $data = $this->normalize(
            $request->validate($this->rules())
        );

        $updated = DB::table('site_popups')
            ->where('id', $popup)
            ->update([
                ...$data,
                'version' => DB::raw('version + 1'),
                'updated_at' => now(),
            ]);

        abort_unless($updated, 404);

        return response()->json([
            'data' => $this->output(
                DB::table('site_popups')->find($popup)
            ),
        ]);
    }

    public function destroy(
        Request $request,
        int $popup
    ): JsonResponse {
        $this->admin($request);

        $deleted = DB::table('site_popups')
            ->where('id', $popup)
            ->delete();

        abort_unless($deleted, 404);

        return response()->json([
            'message' => 'Đã xóa thông báo.',
        ]);
    }
}
