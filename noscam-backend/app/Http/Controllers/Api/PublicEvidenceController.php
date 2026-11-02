<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evidence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublicEvidenceController extends Controller
{
    // Chỉ cho phép tải lên BẢN SAO đã che dữ liệu. Tuyệt đối không tự sao chép file gốc.
    public function upload(Request $request, Evidence $evidence)
    {
        $request->validate(['image' => ['required','image','mimes:jpg,jpeg,png,webp','max:5120']]);
        $file = $request->file('image');
        $path = $file->store('public_evidence_review', 'local');
        $old = DB::table('public_evidence_images')->where('evidence_id', $evidence->id)->first();
        try {
            DB::table('public_evidence_images')->updateOrInsert(
                ['evidence_id' => $evidence->id],
                ['file_path' => $path, 'is_public' => false, 'published_at' => null, 'updated_at' => now(), 'created_at' => $old->created_at ?? now()]
            );
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }
        if ($old) Storage::disk('local')->delete($old->file_path);
        return response()->json(['message' => 'Đã lưu bản che thông tin. Chưa công khai.', 'is_public' => false]);
    }

    // NOSCAM_WATERMARK_PUBLIC_V1
    public function publish(Request $request, Evidence $evidence)
    {
        $request->validate([
            'confirm_redacted' => ['required', 'accepted'],
        ]);

        abort_unless(
            $evidence->report && $evidence->report->status === 'approved',
            422,
            'Báo cáo chưa được duyệt.'
        );

        abort_unless(
            str_starts_with((string) $evidence->mime_type, 'image/'),
            422,
            'Chỉ hỗ trợ ảnh.'
        );

        abort_unless(
            extension_loaded('gd'),
            500,
            'Máy chủ chưa bật PHP GD.'
        );

        $disk = Storage::disk('local');
        $source = $evidence->file_path;

        abort_unless($disk->exists($source), 404);

        $absolute = $disk->path($source);
        $mime = mime_content_type($absolute);

        abort_unless(
            in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true),
            422,
            'Định dạng ảnh không hỗ trợ.'
        );

        abort_unless(
            filesize($absolute) <= 10 * 1024 * 1024,
            422,
            'Ảnh vượt quá 10 MB.'
        );

        $info = getimagesize($absolute);
        abort_unless($info, 422, 'Ảnh không hợp lệ.');

        [$width, $height] = $info;

        abort_unless(
            $width > 0 && $height > 0 &&
            $width * $height <= 20000000,
            422,
            'Kích thước ảnh quá lớn.'
        );

        $bytes = file_get_contents($absolute);
        $image = @imagecreatefromstring($bytes);

        abort_unless($image !== false, 422, 'Không đọc được ảnh.');

        try {
            $maxDimension = 1800;
            $scale = min(1, $maxDimension / max($width, $height));
            $newWidth = max(1, (int) round($width * $scale));
            $newHeight = max(1, (int) round($height * $scale));

            $canvas = imagecreatetruecolor($newWidth, $newHeight);
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefill($canvas, 0, 0, $white);

            imagecopyresampled(
                $canvas, $image,
                0, 0, 0, 0,
                $newWidth, $newHeight,
                $width, $height
            );

            // NOSCAM_DIAGONAL_WATERMARK_V2
            // Một watermark đỏ, bán trong suốt, chéo giữa ảnh.
            // Không thay đổi ảnh bằng chứng gốc.

            $label = 'NOSCAM.VN';

            $fontCandidates = [
                '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            ];

            $fontPath = null;

            foreach ($fontCandidates as $candidate) {
                if (is_file($candidate)) {
                    $fontPath = $candidate;
                    break;
                }
            }

            if (! $fontPath || ! function_exists('imagettftext')) {
                throw new \RuntimeException(
                    'Cần PHP GD FreeType và font TrueType để tạo watermark.'
                );
            }

            // Tạo watermark trên lớp riêng để xoay chính xác.
            $fontSize = max(
                14,
                min($newWidth, $newHeight) * 0.09
            );

            $fontSize = (int) round($fontSize);

            $angle = 35;

            // Điều chỉnh kích thước để chữ không vượt quá ảnh.
            for ($attempt = 0; $attempt < 30; $attempt++) {
                $bbox = imagettfbbox(
                    $fontSize,
                    $angle,
                    $fontPath,
                    $label
                );

                $xs = [$bbox[0], $bbox[2], $bbox[4], $bbox[6]];
                $ys = [$bbox[1], $bbox[3], $bbox[5], $bbox[7]];

                $textWidth = max($xs) - min($xs);
                $textHeight = max($ys) - min($ys);

                if (
                    $textWidth <= $newWidth * 0.83 &&
                    $textHeight <= $newHeight * 0.65
                ) {
                    break;
                }

                $fontSize = max(8, $fontSize - 2);
            }

            // Màu đỏ với độ trong suốt khoảng 65%.
            // GD alpha: 0 = đậm hoàn toàn, 127 = trong suốt.
            $red = imagecolorallocatealpha(
                $canvas,
                220,
                25,
                35,
                83
            );

            $centerX = $newWidth / 2;
            $centerY = $newHeight / 2;

            $minX = min($xs);
            $maxX = max($xs);
            $minY = min($ys);
            $maxY = max($ys);

            $drawX = (int) round(
                $centerX - ($minX + $maxX) / 2
            );

            $drawY = (int) round(
                $centerY - ($minY + $maxY) / 2
            );

            imagettftext(
                $canvas,
                $fontSize,
                $angle,
                $drawX,
                $drawY,
                $red,
                $fontPath,
                $label
            );

            ob_start();
            $encoded = imagejpeg($canvas, null, 88);
            $output = ob_get_clean();

            imagedestroy($canvas);

            abort_unless($encoded && $output, 500, 'Không tạo được ảnh.');
        } finally {
            imagedestroy($image);
        }

        $path = 'public_evidence_review/' . Str::uuid() . '.jpg';

        abort_unless(
            $disk->put($path, $output),
            500,
            'Không lưu được bản sao.'
        );

        $old = DB::table('public_evidence_images')
            ->where('evidence_id', $evidence->id)
            ->first();

        try {
            DB::table('public_evidence_images')->updateOrInsert(
                ['evidence_id' => $evidence->id],
                [
                    'file_path' => $path,
                    'is_public' => true,
                    'published_at' => now(),
                    'created_at' => $old->created_at ?? now(),
                    'updated_at' => now(),
                ]
            );
        } catch (\Throwable $exception) {
            $disk->delete($path);
            throw $exception;
        }

        if ($old && $old->file_path !== $path) {
            $disk->delete($old->file_path);
        }

        return response()->json([
            'message' => 'Đã công khai ảnh có watermark NOSCAM.VN.',
            'is_public' => true,
        ]);
    }

    public function revoke(Evidence $evidence)
    {
        DB::table('public_evidence_images')->where('evidence_id', $evidence->id)->update(['is_public' => false, 'published_at' => null, 'updated_at' => now()]);
        return response()->json(['message' => 'Đã thu hồi công khai.']);
    }

    public function status(Evidence $evidence)
    {
        $row = DB::table('public_evidence_images')->where('evidence_id', $evidence->id)->first();
        return response()->json(['has_redacted_copy' => (bool) $row, 'is_public' => (bool) ($row->is_public ?? false)]);
    }

    public function preview(Evidence $evidence)
    {
        $row = DB::table('public_evidence_images')->where('evidence_id', $evidence->id)->first();
        abort_unless($row && Storage::disk('local')->exists($row->file_path), 404);
        return $this->send($row->file_path);
    }

    public function image(int $id)
    {
        $row = DB::table('public_evidence_images as p')
            ->join('evidences as ev', 'ev.id', '=', 'p.evidence_id')
            ->join('reports as r', 'r.id', '=', 'ev.report_id')
            ->where('p.id', $id)->where('p.is_public', true)->where('r.status', 'approved')
            ->select('p.file_path')->first();
        abort_unless($row && Storage::disk('local')->exists($row->file_path), 404);
        return $this->send($row->file_path);
    }

    private function send(string $path)
    {
        $absolute = Storage::disk('local')->path($path);
        $mime = mime_content_type($absolute);
        abort_unless(in_array($mime, ['image/jpeg','image/png','image/webp'], true), 404);
        return response()->file($absolute, ['Content-Type' => $mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
