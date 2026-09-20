<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evidence;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class AdminEvidenceController extends Controller
{
    public function show(Evidence $evidence): Response
    {
        if (! Storage::disk('local')->exists(
            $evidence->file_path
        )) {
            abort(404, 'Không tìm thấy file evidence.');
        }

        $contents = Storage::disk('local')->get(
            $evidence->file_path
        );

        return response(
            $contents,
            200,
            [
                'Content-Type' =>
                    $evidence->mime_type,

                'Content-Disposition' =>
                    'inline; filename="' .
                    addslashes(
                        $evidence->original_name
                    ) .
                    '"',

                'X-Content-Type-Options' =>
                    'nosniff',

                'Cache-Control' =>
                    'private, no-store, max-age=0',
            ]
        );
    }
}