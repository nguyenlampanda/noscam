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

        if (!preg_match(
            '/^(?:SEVQR\s+)?NOSCAM\s+([A-Za-z0-9_.-]{1,50})$/i',
            $content,
            $matches
        )) {
            return null;
        }

        return $matches[1];
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
