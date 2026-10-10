<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialOrder;
use App\Models\SocialOrderResolution;
use Illuminate\Http\JsonResponse;

class AdminSocialOrderResolutionController extends Controller
{
    public function index(SocialOrder $order): JsonResponse
    {
        $resolutions = SocialOrderResolution::query()
            ->with([
                'admin:id,name,email',
                'audit:id,social_order_id,result,note,evidence',
            ])
            ->where('social_order_id', $order->id)
            ->latest('id')
            ->paginate(30);

        return response()->json([
            'data' => $resolutions,
        ]);
    }
}
