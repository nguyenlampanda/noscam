<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReportController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $status = $request->query(
            'status',
            'pending'
        );

        if (
            ! in_array(
                $status,
                [
                    'pending',
                    'approved',
                    'rejected',
                ],
                true
            )
        ) {
            return response()->json([
                'message' =>
                    'Status không hợp lệ.',
            ], 422);
        }

        $reports = Report::query()
            ->where('status', $status)
            ->with([
                'evidences:id,report_id,original_name,mime_type,file_size',
            ])
            ->withCount('evidences')
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $reports,
        ]);
    }

    public function show(
        Report $report
    ): JsonResponse {
        $report->load([
            'evidences',
            'entities',
        ]);

        return response()->json([
            'data' => $report,
        ]);
    }
}