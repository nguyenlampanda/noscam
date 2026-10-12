<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommunityModerationController extends Controller
{
    private function authorizeModerator(Request $request): void
    {
        abort_unless(
            $request->user()?->canModerate(),
            403,
            'Bạn không có quyền kiểm duyệt cộng đồng.'
        );
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeModerator($request);

        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in(['pending', 'approved', 'rejected']),
            ],
        ]);

        $status = $validated['status'] ?? 'pending';

        $posts = CommunityPost::query()
            ->where('status', $status)
            ->with('user:id,name,username')
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $posts->getCollection()->map(
                fn (CommunityPost $post) => [
                    'id' => $post->id,
                    'title' => $post->title,
                    'content' => $post->content,
                    'category' => $post->category,
                    'status' => $post->status,
                    'is_anonymous' => $post->is_anonymous,
                    'author' => [
                        'id' => $post->user?->id,
                        'name' => $post->user?->name,
                        'username' => $post->user?->username,
                    ],
                    'created_at' => $post->created_at?->toISOString(),
                ]
            )->values(),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function update(Request $request, CommunityPost $post): JsonResponse
    {
        $this->authorizeModerator($request);

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['approved', 'rejected']),
            ],
        ]);

        $status = $validated['status'];

        $post->update([
            'status' => $status,
            'published_at' => $status === 'approved'
                ? ($post->published_at ?? now())
                : null,
        ]);

        return response()->json([
            'message' => $status === 'approved'
                ? 'Đã duyệt bài viết.'
                : 'Đã từ chối bài viết.',
            'data' => [
                'id' => $post->id,
                'status' => $post->status,
            ],
        ]);
    }
}
