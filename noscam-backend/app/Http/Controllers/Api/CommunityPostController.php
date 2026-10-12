<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CommunityPostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $posts = CommunityPost::query()
            ->where('status', 'approved')
            ->with(['user:id,name,username'])
            ->withCount([
                'comments' => fn ($query) =>
                    $query->where('status', 'approved'),
                'reactions',
            ])
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return response()->json([
            'data' => collect($posts->items())
                ->map(fn (CommunityPost $post) =>
                    $this->publicPost($post))
                ->values(),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'min:5', 'max:180'],
            'content' => ['required', 'string', 'min:20', 'max:10000'],
            'category' => [
                'required',
                Rule::in([
                    'discussion',
                    'question',
                    'experience',
                    'warning',
                ]),
            ],
            'is_anonymous' => ['required', 'boolean'],
        ]);

        $post = CommunityPost::create([
            'user_id' => $request->user()->id,
            'title' => trim($validated['title']),
            'content' => trim($validated['content']),
            'category' => $validated['category'],
            'is_anonymous' => $validated['is_anonymous'],
            'status' => 'pending',
            'published_at' => null,
        ]);

        return response()->json([
            'message' => 'Bài viết đã được gửi và đang chờ kiểm duyệt.',
            'data' => [
                'id' => $post->id,
                'status' => $post->status,
            ],
        ], 201);
    }

    private function publicPost(CommunityPost $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'content' => $post->content,
            'category' => $post->category,
            'author' => $post->is_anonymous
                ? 'Thành viên ẩn danh'
                : ($post->user?->username
                    ?: $post->user?->name
                    ?: 'Thành viên NoScam'),
            'is_anonymous' => $post->is_anonymous,
            'comments_count' => $post->comments_count,
            'likes_count' => $post->reactions_count,
            'published_at' => $post->published_at?->toISOString(),
        ];
    }
}
