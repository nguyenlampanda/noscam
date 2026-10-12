<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityPost;
use App\Models\CommunityReaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityReactionController extends Controller
{
    public function store(
        Request $request,
        CommunityPost $post
    ): JsonResponse {
        abort_unless($post->status === 'approved', 404);

        CommunityReaction::query()->firstOrCreate(
            [
                'post_id' => $post->id,
                'user_id' => $request->user()->id,
            ],
            [
                'type' => 'like',
            ]
        );

        return response()->json([
            'message' => 'Đã thích bài viết.',
            'likes_count' => $post->reactions()->count(),
            'liked' => true,
        ]);
    }

    public function destroy(
        Request $request,
        CommunityPost $post
    ): JsonResponse {
        abort_unless($post->status === 'approved', 404);

        CommunityReaction::query()
            ->where('post_id', $post->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json([
            'message' => 'Đã bỏ thích bài viết.',
            'likes_count' => $post->reactions()->count(),
            'liked' => false,
        ]);
    }
}
