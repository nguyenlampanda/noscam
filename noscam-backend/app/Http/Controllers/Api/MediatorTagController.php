<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediatorTag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MediatorTagController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => MediatorTag::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        abort_unless(
            $request->user()?->isAdmin(),
            403,
            'Chỉ quản trị viên được thêm nhãn.'
        );

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
            ],
        ]);

        $name = trim($data['name']);

        $existing = MediatorTag::query()
            ->whereRaw(
                'LOWER(name) = ?',
                [mb_strtolower($name)]
            )
            ->first();

        if ($existing) {
            if (!$existing->is_active) {
                $existing->update([
                    'is_active' => true,
                ]);
            }

            return response()->json([
                'data' => $existing,
            ]);
        }

        $baseSlug = Str::slug($name);

        if ($baseSlug === '') {
            $baseSlug = 'tag';
        }

        $slug = $baseSlug;
        $i = 2;

        while (
            MediatorTag::query()
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug =
                $baseSlug . '-' . $i;

            $i++;
        }

        $tag = MediatorTag::create([
            'name' => $name,
            'slug' => $slug,
            'is_active' => true,
            'sort_order' =>
                (int) MediatorTag::max(
                    'sort_order'
                ) + 1,
        ]);

        return response()->json([
            'message' => 'Đã tạo nhãn.',
            'data' => $tag,
        ], 201);
    }

    public function update(
        Request $request,
        MediatorTag $mediatorTag
    ): JsonResponse {
        abort_unless(
            $request->user()?->isAdmin(),
            403
        );

        $data = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:100',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],

            'sort_order' => [
                'sometimes',
                'integer',
                'min:0',
            ],
        ]);

        if (isset($data['name'])) {
            $data['name'] =
                trim($data['name']);
        }

        $mediatorTag->update($data);

        return response()->json([
            'message' => 'Đã cập nhật nhãn.',
            'data' => $mediatorTag,
        ]);
    }
}
