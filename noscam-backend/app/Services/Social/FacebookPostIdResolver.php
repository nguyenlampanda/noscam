<?php

namespace App\Services\Social;

use RuntimeException;

class FacebookPostIdResolver
{
    public static function resolve(string $url): string
    {
        $url = trim($url);
        $parts = parse_url($url);

        if (
            !is_array($parts)
            || strtolower($parts['scheme'] ?? '') !== 'https'
            || !isset($parts['host'])
            || isset($parts['user'])
            || isset($parts['pass'])
        ) {
            throw new RuntimeException(
                'Vui lòng nhập link Facebook HTTPS hợp lệ.'
            );
        }

        $host = strtolower($parts['host']);

        if (!in_array($host, [
            'facebook.com',
            'www.facebook.com',
            'm.facebook.com',
            'web.facebook.com',
            'mbasic.facebook.com',
        ], true)) {
            throw new RuntimeException(
                'Link phải thuộc tên miền Facebook.'
            );
        }

        $path = $parts['path'] ?? '';
        $query = [];
        parse_str($parts['query'] ?? '', $query);

        if (
            preg_match(
                '~/(?:posts|videos|reel)/([0-9]+)(?:/|$)~i',
                $path,
                $matches
            )
        ) {
            return $matches[1];
        }

        if (
            preg_match(
                '~^/(?:watch|watch/)$~i',
                $path
            )
            && isset($query['v'])
            && is_string($query['v'])
            && ctype_digit($query['v'])
        ) {
            return $query['v'];
        }

        if (
            strtolower($path) === '/permalink.php'
            && isset($query['story_fbid'])
            && is_string($query['story_fbid'])
            && ctype_digit($query['story_fbid'])
        ) {
            return $query['story_fbid'];
        }

        throw new RuntimeException(
            'Không lấy được ID bài viết từ link này. '
            . 'Vui lòng sử dụng link bài viết gốc trên Facebook.'
        );
    }
}
