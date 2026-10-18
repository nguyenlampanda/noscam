<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class CommunityPostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:20'],
            'q' => ['nullable', 'string', 'max:150'],
            'category' => ['nullable', Rule::in([
                'discussion', 'question', 'experience', 'warning',
                'job_offer', 'job_seeking', 'service_offer', 'partnership',
            ])],
            'work_mode' => ['nullable', Rule::in(['remote', 'onsite', 'hybrid'])],
            'city' => ['nullable', 'string', 'max:100'],
        ]);

        $search = trim((string) ($validated['q'] ?? ''));

        $posts = CommunityPost::query()
            ->where('status', 'approved')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('title', 'like', '%'.$search.'%')
                        ->orWhere('content', 'like', '%'.$search.'%')
                        ->orWhere('city', 'like', '%'.$search.'%');
                });
            })
            ->when(
                !empty($validated['category']),
                fn ($query) => $query->where('category', $validated['category'])
            )
            ->when(
                !empty($validated['work_mode']),
                fn ($query) => $query->where('work_mode', $validated['work_mode'])
            )
            ->when(
                !empty($validated['city']),
                fn ($query) => $query->where('city', 'like', '%'.$validated['city'].'%')
            )
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
            'title' => ['nullable', 'string', 'max:180'],
            'content' => ['nullable', 'string', 'max:10000'],
            'category' => [
                'required',
                Rule::in([
                    'discussion',
                    'question',
                    'experience',
                    'warning',
                    'job_offer',
                    'job_seeking',
                    'service_offer',
                    'partnership',
                ]),
            ],
            'work_mode' => ['nullable', Rule::in(['remote', 'onsite', 'hybrid'])],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:250'],
            'salary' => ['nullable', 'string', 'max:100'],
            'salary_unit' => ['nullable', Rule::in([
                'hour', 'day', 'month', 'project', 'negotiable',
            ])],
            'deadline' => ['nullable', 'date', 'after_or_equal:today'],
            'contact' => ['nullable', 'string', 'max:250'],
            'is_anonymous' => ['required', 'boolean'],
            'images' => ['sometimes', 'array', 'max:10'],
            'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if (
            trim((string) ($validated['title'] ?? '')) === '' &&
            trim((string) ($validated['content'] ?? '')) === '' &&
            count($request->file('images', [])) === 0
        ) {
            return response()->json([
                'message' => 'Vui lòng nhập nội dung bài viết.',
            ], 422);
        }

        $isMmo = in_array($validated['category'], [
            'job_offer', 'job_seeking', 'service_offer', 'partnership',
        ], true);

        if ($isMmo) {
            if (
                trim((string) ($validated['title'] ?? '')) === '' ||
                trim((string) ($validated['content'] ?? '')) === '' ||
                trim((string) ($validated['contact'] ?? '')) === ''
            ) {
                return response()->json([
                    'message' => 'Job cần tiêu đề, mô tả và cách liên hệ.',
                ], 422);
            }

            $mode = $validated['work_mode'] ?? 'remote';
            if ($mode !== 'remote' && (
                empty(trim((string) ($validated['city'] ?? ''))) ||
                empty(trim((string) ($validated['address'] ?? '')))
            )) {
                return response()->json([
                    'message' => 'Công việc trực tiếp/hybrid cần địa điểm.',
                ], 422);
            }
        }

        $imagePaths = [];
        try {
            foreach ($request->file('images', []) as $image) {
                $imagePaths[] = $image->store('community/posts', 'public');
            }

            $post = CommunityPost::create([
            'user_id' => $request->user()->id,
            'title' => trim((string) ($validated['title'] ?? '')),
            'content' => trim((string) ($validated['content'] ?? '')),
            'category' => $validated['category'],
            'is_anonymous' => $validated['is_anonymous'],
            'status' => 'pending',
            'published_at' => null,
            'images' => $imagePaths,
            'work_mode' => $isMmo ? ($validated['work_mode'] ?? 'remote') : null,
            'city' => $isMmo ? ($validated['city'] ?? null) : null,
            'address' => $isMmo ? ($validated['address'] ?? null) : null,
            'salary' => $isMmo ? ($validated['salary'] ?? null) : null,
            'salary_unit' => $isMmo ? ($validated['salary_unit'] ?? null) : null,
            'deadline' => $isMmo ? ($validated['deadline'] ?? null) : null,
            'contact' => $isMmo ? ($validated['contact'] ?? null) : null,
            ]);
        } catch (\Throwable $e) {
            foreach ($imagePaths as $path) {
                Storage::disk('public')->delete($path);
            }
            throw $e;
        }

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
            'images' => collect($post->images ?? [])->map(fn ($path) => url('storage/'.$path))->values(),
            'category' => $post->category,
            'work_mode' => $post->work_mode,
            'city' => $post->city,
            'address' => $post->address,
            'salary' => $post->salary,
            'salary_unit' => $post->salary_unit,
            'deadline' => $post->deadline?->format('Y-m-d'),
            'contact' => $post->contact,
            'author' => $post->is_anonymous
                ? 'Thành viên ẩn danh'
                : ($post->user?->username
                    ?: $post->user?->name
                    ?: 'Thành viên NoScam'),
            'is_anonymous' => $post->is_anonymous,
            'comments_count' => $post->comments_count,
            'likes_count' => $post->reactions_count,
                    'liked_by_me' => auth('sanctum')->check()
                        ? $post->reactions()
                            ->where('user_id', auth('sanctum')->id())
                            ->exists()
                        : false,
            'published_at' => $post->published_at?->toISOString(),
        ];
    }
}
