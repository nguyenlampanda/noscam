<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AdminSocialOrderReconciliationController extends Controller
{
    public function resolve(): JsonResponse
    {
        return response()->json([
            'message' => 'Chức năng xử lý đối soát đang tạm khóa để hoàn thiện xác minh và nhật ký giao dịch.',
        ], 503);
    }
}
