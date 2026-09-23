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
        $status =
            $request->query(
                'status',
                'pending'
            );

        $search =
            trim(
                (string) $request->query(
                    'search',
                    ''
                )
            );

        $page =
            max(
                1,
                (int) $request->query(
                    'page',
                    1
                )
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

        $query =
            Report::query()
                ->where(
                    'status',
                    $status
                )
                ->with([
                    'evidences:id,report_id,original_name,mime_type,file_size',
                ])
                ->withCount(
                    'evidences'
                );

        if ($search !== '') {
            $query->where(
                function ($query) use (
                    $search
                ) {
                    $query
                        ->where(
                            'phone',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'bank_account',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'bank',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'social',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'website',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'description',
                            'like',
                            "%{$search}%"
                        );

                    if (
                        ctype_digit(
                            $search
                        )
                    ) {
                        $query->orWhere(
                            'id',
                            (int) $search
                        );
                    }
                }
            );
        }

        $reports =
            $query
                ->latest()
                ->paginate(
                    perPage: 10,
                    page: $page
                );

        return response()->json([
            'data' =>
                $reports,
        ]);
    }

    public function show(
        Report $report
    ): JsonResponse {
        $report->load([
            'evidences',
            'entities',

            'moderationLogs' =>
                function ($query) {
                    $query
                        ->with([
                            'user:id,name,email,role',
                        ])
                        ->latest();
                },
        ]);

        return response()->json([
            'data' =>
                $report,
        ]);
    }
}