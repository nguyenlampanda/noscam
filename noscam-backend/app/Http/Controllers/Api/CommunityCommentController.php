<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityComment;
use App\Models\CommunityPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityCommentController extends Controller
{
    public function index(
        Request $request,
        CommunityPost $post
    ): JsonResponse {
        abort_unless($post->status === 'approved', 404);

        $comments = CommunityComment::query()
            ->where('post_id', $post->id)
            ->where('status', 'approved')
            ->with('user:id,name,username')
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate(30);

        return response()->json([
            'data' => $comments->getCollection()
                ->map(fn (CommunityComment $comment) => [
                    'id' => $comment->id,
                    'parent_id' => $comment->parent_id,
                    'content' => $comment->content,
                    'author' => $comment->is_anonymous
                        ? 'Thành viên ẩn danh'
                        : ($comment->user?->username
                            ?: $comment->user?->name
                            ?: 'Thành viên NoScam'),
                    'is_anonymous' => $comment->is_anonymous,
                    'created_at' => $comment->created_at?->toISOString(),
                ])->values(),
            'meta' => [
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'total' => $comments->total(),
            ],
        ]);
    }

    public function store(
        Request $request,
        CommunityPost $post
    ): JsonResponse {
        abort_unless($post->status === 'approved', 404);

        $validated = $request->validate([
            'content' => [
                'required', 'string', 'min:2', 'max:3000',
            ],
            'is_anonymous' => [
                'required', 'boolean',
            ],
            'parent_id' => [
                'nullable',
                'integer',
                'exists:community_comments,id',
            ],
        ]);

        $parentId = $validated['parent_id'] ?? null;

        if ($parentId !== null) {
            $parent = CommunityComment::query()
                ->where('id', $parentId)
                ->where('post_id', $post->id)
                ->where('status', 'approved')
                ->first();

            if (!$parent) {
                return response()->json([
                    'message' => 'Bình luận được trả lời không hợp lệ.',
                ], 422);
            }
        }

        $comment = CommunityComment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'parent_id' => $parentId,
            'content' => trim($validated['content']),
            'is_anonymous' => $validated['is_anonymous'],
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Bình luận đã được gửi và đang chờ kiểm duyệt.',
            'data' => [
                'id' => $comment->id,
                'status' => $comment->status,
            ],
        ], 201);
    }
}
