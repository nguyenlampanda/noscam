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
use Illuminate\Support\Str;
use Throwable;

class ReportController extends Controller
{
    private const DUPLICATE_WINDOW_MINUTES = 10;

    public function store(
        StoreReportRequest $request
    ): JsonResponse {
        if (filled($request->input('website_confirm'))) {
    return response()->json([
        'message' =>
            'Báo cáo đã được gửi và đang chờ kiểm duyệt.',

        'data' => [
            'id' => null,
            'status' => 'pending',
            'created_at' => now(),
        ],
    ], 201);
}
        $validated = $request->validated();

        $reportData = collect($validated)
            ->except('evidences')
            ->all();

        $reportData =
            $this->normalizeReportData(
                $reportData
            );

        $fingerprint =
            $this->makeFingerprint(
                $reportData
            );

        $submitterHash =
            $this->makeSubmitterHash(
                $request->ip()
            );

        $duplicateExists =
            Report::query()
                ->where(
                    'submission_fingerprint',
                    $fingerprint
                )
                ->where(
                    'submitter_hash',
                    $submitterHash
                )
                ->where(
                    'created_at',
                    '>=',
                    now()->subMinutes(
                        self::DUPLICATE_WINDOW_MINUTES
                    )
                )
                ->exists();

        if ($duplicateExists) {
            return response()->json([
                'message' =>
                    'Báo cáo này vừa được gửi. Vui lòng không gửi lặp lại liên tục.',

                'code' =>
                    'DUPLICATE_REPORT',
            ], 409);
        }

        $storedEvidencePaths = [];

        try {
            $report = DB::transaction(
                function () use (
                    $reportData,
                    $fingerprint,
                    $submitterHash,
                    $request,
                    &$storedEvidencePaths
                ) {
                    $report = Report::create([
                        ...$reportData,

                        'status' =>
                            'pending',

                        'submission_fingerprint' =>
                            $fingerprint,

                        'submitter_hash' =>
                            $submitterHash,
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
                'id' =>
                    $report->id,

                'status' =>
                    $report->status,

                'created_at' =>
                    $report->created_at,
            ],
        ], 201);
    }

    private function normalizeReportData(
        array $data
    ): array {
        $data['scam_type'] =
            $this->cleanText(
                $data['scam_type'] ?? null
            );

        $data['phone'] =
            $this->normalizePhone(
                $data['phone'] ?? null
            );

        $data['bank_account'] =
            $this->normalizeBankAccount(
                $data['bank_account'] ?? null
            );

        $data['bank'] =
            $this->cleanText(
                $data['bank'] ?? null
            );

        $data['social'] =
            $this->normalizeSocial(
                $data['social'] ?? null
            );

        $data['website'] =
            $this->normalizeWebsite(
                $data['website'] ?? null
            );

        $data['description'] =
            $this->cleanDescription(
                $data['description'] ?? null
            );

        return $data;
    }

    private function makeFingerprint(
        array $data
    ): string {
        /*
         * Không dùng số tiền/ngày xảy ra/loại sự việc
         * để quyết định duplicate.
         *
         * Mục tiêu là nhận diện việc cùng một nguồn
         * gửi lại cùng nội dung về cùng đối tượng.
         */
        $fingerprintData = [
            'phone' =>
                $data['phone'] ?? '',

            'bank_account' =>
                $data['bank_account'] ?? '',

            'social' =>
                $data['social'] ?? '',

            'website' =>
                $data['website'] ?? '',

            'description' =>
                $this->fingerprintText(
                    $data['description'] ?? null
                ),
        ];

        return hash(
            'sha256',
            json_encode(
                $fingerprintData,
                JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
            )
        );
    }

    private function makeSubmitterHash(
        ?string $ip
    ): string {
        /*
         * Không lưu IP thô.
         * HMAC bằng APP_KEY để giá trị trong DB
         * không thể dùng như một danh sách IP.
         */
        return hash_hmac(
            'sha256',
            $ip ?? 'unknown',
            (string) config('app.key')
        );
    }

    private function cleanText(
        mixed $value
    ): ?string {
        if (! is_string($value)) {
            return $value === null
                ? null
                : trim((string) $value);
        }

        $value = trim($value);

        $value =
            preg_replace(
                '~\s+~u',
                ' ',
                $value
            ) ?? $value;

        return $value === ''
            ? null
            : $value;
    }

    private function cleanDescription(
        mixed $value
    ): ?string {
        if ($value === null) {
            return null;
        }

        $value = trim(
            (string) $value
        );

        $value =
            preg_replace(
                "~[ \t]+~u",
                ' ',
                $value
            ) ?? $value;

        $value =
            preg_replace(
                "~\R{3,}~u",
                "\n\n",
                $value
            ) ?? $value;

        return $value === ''
            ? null
            : $value;
    }

    private function normalizePhone(
        mixed $value
    ): ?string {
        if (! filled($value)) {
            return null;
        }

        $value = trim(
            (string) $value
        );

        $hasVietnamCountryCode =
            preg_match(
                '~^\s*(?:\+84|84)[\s.()_-]*~',
                $value
            ) === 1;

        $digits =
            preg_replace(
                '~[^0-9]+~',
                '',
                $value
            ) ?? '';

        if ($digits === '') {
            return null;
        }

        if (
            $hasVietnamCountryCode &&
            str_starts_with(
                $digits,
                '84'
            )
        ) {
            return '0'.substr(
                $digits,
                2
            );
        }

        return $digits;
    }

    private function normalizeBankAccount(
        mixed $value
    ): ?string {
        if (! filled($value)) {
            return null;
        }

        $normalized =
            preg_replace(
                '~\s+~',
                '',
                trim((string) $value)
            ) ?? '';

        return $normalized === ''
            ? null
            : $normalized;
    }

    private function normalizeWebsite(
        mixed $value
    ): ?string {
        if (! filled($value)) {
            return null;
        }

        $value = Str::lower(
            trim((string) $value)
        );

        $value = preg_replace(
            '~^https?://~',
            '',
            $value
        ) ?? '';

        $value = preg_replace(
            '~^www\.~',
            '',
            $value
        ) ?? '';

        /*
         * Website entity dùng domain làm
         * canonical value.
         *
         * example.com/path?a=1
         * -> example.com
         */
        $value = preg_replace(
            '~[/?#].*$~',
            '',
            $value
        ) ?? '';

        $value = trim($value);

        return $value === ''
            ? null
            : $value;
    }

    private function normalizeSocial(
        mixed $value
    ): ?string {
        if (! filled($value)) {
            return null;
        }

        $value = Str::lower(
            trim((string) $value)
        );

        $value = preg_replace(
            '~^https?://~',
            '',
            $value
        ) ?? '';

        $value = preg_replace(
            '~^www\.~',
            '',
            $value
        ) ?? '';

        /*
         * Chuẩn hóa các host alias phổ biến.
         */
        $value = preg_replace(
            '~^m\.facebook\.com/~',
            'facebook.com/',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~^fb\.com/~',
            'facebook.com/',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~^telegram\.me/~',
            't.me/',
            $value
        ) ?? $value;

        /*
         * Query/hash thường là tracking,
         * không phải định danh tài khoản.
         */
        $value = preg_replace(
            '~[?#].*$~',
            '',
            $value
        ) ?? '';

        $value = rtrim(
            $value,
            '/'
        );

        return $value === ''
            ? null
            : $value;
    }

    private function fingerprintText(
        mixed $value
    ): string {
        if (! filled($value)) {
            return '';
        }

        $value =
            Str::lower(
                trim((string) $value)
            );

        return preg_replace(
            '~\s+~u',
            ' ',
            $value
        ) ?? $value;
    }

    private function storeEvidences(
        Report $report,
        array $files
    ): array {
        $storedPaths = [];

        try {
            foreach ($files as $file) {
                if (
                    ! $file instanceof UploadedFile
                ) {
                    continue;
                }

                $path = $file->store(
                    "evidences/{$report->id}",
                    'local'
                );

                $storedPaths[] = $path;

                Evidence::create([
                    'report_id' =>
                        $report->id,

                    'original_name' =>
                        $file->getClientOriginalName(),

                    'file_name' =>
                        basename($path),

                    'file_path' =>
                        $path,

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