<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportRequest;
use App\Models\Evidence;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ReportController extends Controller
{
    public function store(StoreReportRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $storedEvidencePaths = [];

        try {
            $report = DB::transaction(
                function () use (
                    $validated,
                    $request,
                    &$storedEvidencePaths
                ) {
                    $reportData = collect($validated)
                        ->except('evidences')
                        ->all();

                    $report = Report::create([
                        ...$reportData,
                        'status' => 'pending',
                    ]);

                    $storedEvidencePaths =
                        $this->storeEvidences(
                            $report,
                            $request->file(
                                'evidences',
                                []
                            )
                        );

                    return $report;
                }
            );
        } catch (Throwable $exception) {
            if (! empty($storedEvidencePaths)) {
                Storage::disk('local')->delete(
                    $storedEvidencePaths
                );
            }

            throw $exception;
        }

        return response()->json([
            'message' =>
                'Báo cáo đã được gửi và đang chờ kiểm duyệt.',

            'data' => [
                'id' => $report->id,
                'status' => $report->status,
                'created_at' => $report->created_at,
            ],
        ], 201);
    }

    private function storeEvidences(
        Report $report,
        array $files
    ): array {
        $storedPaths = [];

        try {
            foreach ($files as $file) {
                if (! $file instanceof UploadedFile) {
                    continue;
                }

                $path = $file->store(
                    "evidences/{$report->id}",
                    'local'
                );

                $storedPaths[] = $path;

                Evidence::create([
                    'report_id' => $report->id,

                    'original_name' =>
                        $file->getClientOriginalName(),

                    'file_name' =>
                        basename($path),

                    'file_path' => $path,

                    'mime_type' =>
                        $file->getMimeType()
                        ?? 'application/octet-stream',

                    'file_size' =>
                        $file->getSize(),
                ]);
            }

            return $storedPaths;
        } catch (Throwable $exception) {
            if (! empty($storedPaths)) {
                Storage::disk('local')->delete(
                    $storedPaths
                );
            }

            throw $exception;
        }
    }
}