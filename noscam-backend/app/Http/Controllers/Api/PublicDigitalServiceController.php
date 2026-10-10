<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicDigitalServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => ['nullable', 'string', 'max:100'],
            'platform' => ['nullable', 'string', 'max:50'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $query = DigitalService::query()
            ->where('is_active', true);

        if (!empty($data['category'])) {
            $query->where('category', $data['category']);
        }

        if (!empty($data['platform'])) {
            $query->where('platform', $data['platform']);
        }

        if (!empty($data['search'])) {
            $search = $data['search'];

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere(
                        'description',
                        'like',
                        "%{$search}%"
                    );
            });
        }

        return response()->json([
            'data' => $query
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get([
                    'id',
                    'code',
                    'category',
                    'name',
                    'description',
                    'pricing_type',
                    'price_vnd',
                    'platform',
                    'requirements',
                ]),
        ]);
    }

    public function show(
        DigitalService $digitalService
    ): JsonResponse {
        abort_unless($digitalService->is_active, 404);

        return response()->json([
            'data' => $digitalService->only([
                'id',
                'code',
                'category',
                'name',
                'description',
                'pricing_type',
                'price_vnd',
                'platform',
                'requirements',
            ]),
        ]);
    }
}
