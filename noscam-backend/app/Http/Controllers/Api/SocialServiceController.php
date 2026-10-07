<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialServiceController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $query = SocialService::query()
            ->where('is_active', true)
            ->whereHas(
                'providerServices',
                function ($q) {
                    $q->where(
                        'is_active',
                        true
                    )->whereHas(
                        'provider',
                        fn ($provider) =>
                            $provider->where(
                                'status',
                                'active'
                            )
                    );
                }
            );

        if ($request->filled('platform')) {
            $query->where(
                'platform',
                $request->string('platform')
            );
        }

        if ($request->filled('category')) {
            $query->where(
                'category',
                $request->string('category')
            );
        }

        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input(
                    'search'
                )
            );

            $query->where(
                function ($q) use ($search) {
                    $q->where(
                        'name',
                        'like',
                        "%{$search}%"
                    )->orWhere(
                        'code',
                        'like',
                        "%{$search}%"
                    )->orWhere(
                        'category',
                        'like',
                        "%{$search}%"
                    );
                }
            );
        }

        $services = $query
            ->orderBy('platform')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'platform',
                'category',
                'name',
                'description',
                'min_quantity',
                'max_quantity',
                'sell_price_per_1000',
            ]);

        return response()->json([
            'data' => $services,
        ]);
    }

    public function show(
        SocialService $service
    ): JsonResponse {
        if (!$service->is_active) {
            abort(404);
        }

        return response()->json([
            'data' => [
                'id' =>
                    $service->id,
                'code' =>
                    $service->code,
                'platform' =>
                    $service->platform,
                'category' =>
                    $service->category,
                'name' =>
                    $service->name,
                'description' =>
                    $service->description,
                'min_quantity' =>
                    $service->min_quantity,
                'max_quantity' =>
                    $service->max_quantity,
                'sell_price_per_1000' =>
                    $service
                        ->sell_price_per_1000,
            ],
        ]);
    }
}
