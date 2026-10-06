<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediatorBank;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MediatorBankController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' =>
                MediatorBank::query()
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get(),
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique(
                    'mediator_banks',
                    'name'
                ),
            ],
        ]);

        $name = trim($data['name']);

        $baseSlug = Str::slug($name);
        $slug = $baseSlug;
        $number = 2;

        while (
            MediatorBank::query()
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug =
                $baseSlug.'-'.$number;

            $number++;
        }

        $bank = MediatorBank::create([
            'name' => $name,
            'slug' => $slug,
            'is_active' => true,
            'sort_order' =>
                (
                    (int)
                    MediatorBank::max(
                        'sort_order'
                    )
                ) + 1,
        ]);

        return response()->json([
            'message' =>
                'Đã thêm ngân hàng.',
            'data' => $bank,
        ], 201);
    }

    public function update(
        Request $request,
        MediatorBank $mediatorBank
    ): JsonResponse {
        $data = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:150',
                Rule::unique(
                    'mediator_banks',
                    'name'
                )->ignore(
                    $mediatorBank->id
                ),
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ]);

        if (
            array_key_exists(
                'name',
                $data
            )
        ) {
            $data['name'] =
                trim($data['name']);

            $data['slug'] =
                Str::slug(
                    $data['name']
                );
        }

        $mediatorBank->update($data);

        return response()->json([
            'message' =>
                'Đã cập nhật ngân hàng.',
            'data' =>
                $mediatorBank->fresh(),
        ]);
    }
}
