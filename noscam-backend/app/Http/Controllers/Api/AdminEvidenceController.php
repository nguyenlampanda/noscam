<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evidence;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class AdminEvidenceController extends Controller
{
    // NOSCAM_WATERMARK_V1
    public function show(Evidence $evidence): Response
    {
        if (! Storage::disk('local')->exists($evidence->file_path)) {
            abort(404, 'Không tìm thấy file evidence.');
        }

        $contents = Storage::disk('local')->get($evidence->file_path);
        $mime = (string) $evidence->mime_type;

        $approved = $evidence->report()
            ->where('status', 'approved')
            ->exists();

        if ($approved && in_array($mime, [
            'image/jpeg',
            'image/png',
            'image/webp',
        ], true)) {
            $contents = $this->watermark($contents, $mime);
        }

        $filename = str_replace(
            ['"', "\r", "\n", '\\'],
            '_',
            basename((string) $evidence->original_name)
        );

        return response($contents, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' =>
                'inline; filename="' . $filename . '"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    private function watermark(string $contents, string $mime): string
    {
        if (! extension_loaded('gd') ||
            ! function_exists('imagettftext')) {
            abort(503, 'Máy chủ chưa hỗ trợ watermark.');
        }

        $font = $this->watermarkFont();

        if ($font === null) {
            abort(503, 'Máy chủ thiếu font watermark.');
        }

        $image = @imagecreatefromstring($contents);

        if ($image === false) {
            abort(422, 'Không thể xử lý ảnh bằng chứng.');
        }

        try {
            $width = imagesx($image);
            $height = imagesy($image);

            if ($width < 1 || $height < 1) {
                abort(422, 'Kích thước ảnh không hợp lệ.');
            }

            imagealphablending($image, true);
            imagesavealpha($image, true);

            $text = 'NOSCAM.VN';
            $angle = 30;

            $fontSize = max(
                10,
                (int) round(min($width, $height) * 0.11)
            );

            // Giới hạn độ rộng chữ để không vượt ra khỏi ảnh.
            do {
                $box = imagettfbbox($fontSize, $angle, $font, $text);

                if ($box === false) {
                    abort(503, 'Không thể tạo watermark.');
                }

                $textWidth = max($box[0], $box[2], $box[4], $box[6])
                    - min($box[0], $box[2], $box[4], $box[6]);

                $textHeight = max($box[1], $box[3], $box[5], $box[7])
                    - min($box[1], $box[3], $box[5], $box[7]);

                if (
                    ($textWidth <= $width * 0.82 &&
                     $textHeight <= $height * 0.65) ||
                    $fontSize <= 10
                ) {
                    break;
                }

                $fontSize -= 2;
            } while (true);

            $minX = min($box[0], $box[2], $box[4], $box[6]);
            $maxX = max($box[0], $box[2], $box[4], $box[6]);
            $minY = min($box[1], $box[3], $box[5], $box[7]);
            $maxY = max($box[1], $box[3], $box[5], $box[7]);

            $x = (int) round($width / 2 - ($minX + $maxX) / 2);
            $y = (int) round($height / 2 - ($minY + $maxY) / 2);

            // GD alpha: 0 = đục, 127 = trong suốt.
            $color = imagecolorallocatealpha(
                $image,
                255,
                255,
                255,
                75
            );

            imagettftext(
                $image,
                $fontSize,
                $angle,
                $x,
                $y,
                $color,
                $font,
                $text
            );

            ob_start();

            $success = match ($mime) {
                'image/jpeg' => imagejpeg($image, null, 90),
                'image/png' => imagepng($image),
                'image/webp' => imagewebp($image, null, 90),
                default => false,
            };

            $result = ob_get_clean();

            if (! $success || ! is_string($result) || $result === '') {
                abort(503, 'Không thể xuất ảnh watermark.');
            }

            return $result;
        } finally {
            imagedestroy($image);
        }
    }

    private function watermarkFont(): ?string
    {
        $configured = env('NOSCAM_WATERMARK_FONT');

        $candidates = array_filter([
            $configured,
            '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
            '/System/Library/Fonts/Supplemental/Arial.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
            '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
        ]);

        foreach ($candidates as $font) {
            if (is_readable($font)) {
                return $font;
            }
        }

        return null;
    }
}
