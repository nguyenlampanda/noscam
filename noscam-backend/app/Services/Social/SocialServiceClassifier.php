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
        // NOSCAM_SOCIAL_PLATFORM_EXPANSION_V4: API service-name hints.
        if (preg_match('~\bthreads?\b~i', $text)) return 'threads';
        if (preg_match('~\byou\s*tube\b|\byoutube\b~i', $text)) return 'youtube';
        if (preg_match('~\btelegram\b~i', $text)) return 'telegram';
        if (preg_match('~\btwitter\b|\bx\s*\(twitter\)~i', $text)) return 'twitter';
        if (preg_match('~\bdiscord\b~i', $text)) return 'discord';
        if (preg_match('~\bspotify\b~i', $text)) return 'spotify';
        if (preg_match('~\bsoundcloud\b~i', $text)) return 'soundcloud';
        if (preg_match('~\bpinterest\b~i', $text)) return 'pinterest';
        if (preg_match('~\blinkedin\b~i', $text)) return 'linkedin';
        if (preg_match('~\btwitch\b~i', $text)) return 'twitch';
        if (preg_match('~\breddit\b~i', $text)) return 'reddit';
        if (preg_match('~\bsnapchat\b~i', $text)) return 'snapchat';
        if (preg_match('~\bwhatsapp\b~i', $text)) return 'whatsapp';
        if (preg_match('~\bzalo\b~i', $text)) return 'zalo';

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
