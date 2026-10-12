<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommunityCommentModerationController extends Controller
{
    private function authorizeModerator(Request $request): void
    {
        abort_unless(
            $request->user()?->canModerate(),
            403,
            'Bạn không có quyền kiểm duyệt bình luận.'
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

        $comments = CommunityComment::query()
            ->where('status', $status)
            ->with([
                'user:id,name,username',
                'post:id,title,status',
            ])
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $comments->getCollection()
                ->map(fn (CommunityComment $comment) => [
                    'id' => $comment->id,
                    'post_id' => $comment->post_id,
                    'post_title' => $comment->post?->title,
                    'post_status' => $comment->post?->status,
                    'parent_id' => $comment->parent_id,
                    'content' => $comment->content,
                    'status' => $comment->status,
                    'is_anonymous' => $comment->is_anonymous,
                    'author' => [
                        'id' => $comment->user?->id,
                        'name' => $comment->user?->name,
                        'username' => $comment->user?->username,
                    ],
                    'created_at' => $comment->created_at?->toISOString(),
                ])->values(),
            'meta' => [
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'total' => $comments->total(),
            ],
        ]);
    }

    public function update(
        Request $request,
        CommunityComment $comment
    ): JsonResponse {
        $this->authorizeModerator($request);

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['approved', 'rejected']),
            ],
        ]);

        if ($validated['status'] === 'approved') {
            if ($comment->post?->status !== 'approved') {
                return response()->json([
                    'message' => 'Bài viết chưa được duyệt.',
                ], 422);
            }

            if ($comment->parent_id !== null) {
                $parentApproved = CommunityComment::query()
                    ->whereKey($comment->parent_id)
                    ->where('post_id', $comment->post_id)
                    ->where('status', 'approved')
                    ->exists();

                if (!$parentApproved) {
                    return response()->json([
                        'message' => 'Bình luận cha chưa được duyệt.',
                    ], 422);
                }
            }
        }

        $comment->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => $comment->status === 'approved'
                ? 'Đã duyệt bình luận.'
                : 'Đã từ chối bình luận.',
            'data' => [
                'id' => $comment->id,
                'status' => $comment->status,
            ],
        ]);
    }
}
