<?php

namespace App\Services\Social;

use Illuminate\Support\Str;

class SocialServiceClassifier
{
    public function classify(string $name): array
    {
        $text = Str::lower(
            trim($name)
        );

        return [
            'platform' =>
                $this->platform($text),

            'category' =>
                $this->category($text),
        ];
    }

    public function platform(
        string $text
    ): string {
        if (
            str_contains(
                $text,
                'instagram'
            ) ||
            preg_match(
                '/(^|\W)ig(\W|$)/i',
                $text
            )
        ) {
            return 'instagram';
        }

        if (
            str_contains(
                $text,
                'tiktok'
            ) ||
            str_contains(
                $text,
                'tik tok'
            )
        ) {
            return 'tiktok';
        }

        if (
            str_contains(
                $text,
                'facebook'
            ) ||
            preg_match(
                '/(^|\W)fb(\W|$)/i',
                $text
            )
        ) {
            return 'facebook';
        }

        return 'other';
    }

    public function category(
        string $text
    ): string {
        if (
            str_contains(
                $text,
                'follower'
            ) ||
            str_contains(
                $text,
                'followers'
            ) ||
            str_contains(
                $text,
                'follow '
            )
        ) {
            return 'follow';
        }

        if (
            str_contains(
                $text,
                'comment'
            )
        ) {
            return 'comment';
        }

        if (
            str_contains(
                $text,
                'share'
            )
        ) {
            return 'share';
        }

        if (
            str_contains(
                $text,
                'view'
            ) ||
            str_contains(
                $text,
                'views'
            ) ||
            str_contains(
                $text,
                'watch'
            )
        ) {
            return 'view';
        }

        if (
            str_contains(
                $text,
                'reaction'
            ) ||
            str_contains(
                $text,
                'react'
            )
        ) {
            return 'reaction';
        }

        if (
            str_contains(
                $text,
                'like'
            ) ||
            str_contains(
                $text,
                'likes'
            )
        ) {
            return 'like';
        }

        if (
            str_contains(
                $text,
                'member'
            )
        ) {
            return 'member';
        }

        if (
            str_contains(
                $text,
                'save'
            ) ||
            str_contains(
                $text,
                'favorite'
            ) ||
            str_contains(
                $text,
                'favourite'
            )
        ) {
            return 'save';
        }

        return 'other';
    }
}
