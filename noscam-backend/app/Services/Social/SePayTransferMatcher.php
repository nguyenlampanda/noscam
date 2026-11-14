<?php

namespace App\Services\Social;

use App\Models\User;

class SePayTransferMatcher
{
    /**
     * Nhận diện nội dung nạp tự động:
     * NOSCAM username
     *
     * Không tự đoán username khi nội dung không rõ ràng.
     */
    public function usernameFromContent(string $content): ?string
    {
        $content = trim($content);

        // Giữ tương thích với nội dung nạp tiền cũ.
        if (preg_match(
            '/^NOSCAM\s+([A-Za-z0-9_.-]{1,50})$/i',
            $content,
            $legacy
        )) {
            return $legacy[1];
        }

        // SEVQR NOSCAM username có thể nằm giữa nội dung ngân hàng.
        // Hỗ trợ cả định dạng VietinBank NOSCAMusername.
        preg_match_all(
            '/(?<![A-Za-z0-9])SEVQR\s+NOSCAM\s*([A-Za-z0-9_.-]{1,50})(?![A-Za-z0-9_.-])/i',
            $content,
            $matches,
            PREG_SET_ORDER | PREG_OFFSET_CAPTURE
        );

        if (count($matches) !== 1) {
            return null;
        }

        $match = $matches[0];
        $username = $match[1][0];

        if ($username === '') {
            return null;
        }

        // Chỉ cho phép phần nội dung ngân hàng phía sau
        // nếu là mã giao dịch, không phải username thứ hai.
        $end = $match[0][1] + strlen($match[0][0]);
        $suffix = trim(substr($content, $end));

        if ($suffix !== ''
            && !preg_match(
                '/^(?:(?:FT|GD|REF|TRACE)[A-Za-z0-9-]+(?:\s+|$))+$/i',
                $suffix
            )) {
            return null;
        }

        return $username;
    }

    public function userFromContent(string $content): ?User
    {
        $username = $this->usernameFromContent($content);

        if ($username === null) {
            return null;
        }

        return User::query()
            ->where('username', $username)
            ->first();
    }
}
