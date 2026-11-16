<?php

namespace App\Services\Social\Providers;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class HackLike17Provider extends StandardSmmProvider
{
    public function createOrder(
        string $serviceId,
        string $target,
        int $quantity,
        array $options = []
    ): array {
        $target = $this->normalizeTikTokUrl($target);

        return parent::createOrder(
            $serviceId,
            $target,
            $quantity,
            $options
        );
    }

    private function normalizeTikTokUrl(string $url): string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        if (!in_array($host, ['vt.tiktok.com', 'vm.tiktok.com'], true)) {
            return $url;
        }

        $current = $url;

        for ($i = 0; $i < 5; $i++) {
            $parts = parse_url($current);

            if (!is_array($parts)
                || ($parts['scheme'] ?? '') !== 'https'
                || isset($parts['user'])
                || isset($parts['pass'])
                || isset($parts['port'])
                || !in_array(strtolower($parts['host'] ?? ''), [
                    'vt.tiktok.com',
                    'vm.tiktok.com',
                    'www.tiktok.com',
                    'm.tiktok.com',
                    'tiktok.com',
                ], true)
            ) {
                throw new RuntimeException('TikTok redirect không hợp lệ.');
            }

            $path = $parts['path'] ?? '';

            if (in_array(strtolower($parts['host']), [
                'www.tiktok.com',
                'm.tiktok.com',
                'tiktok.com',
            ], true) && preg_match(
                '~^/@[^/]+/video/[0-9]+/?$~',
                $path
            )) {
                return 'https://www.tiktok.com'.rtrim($path, '/');
            }

            $response = Http::withOptions([
                'allow_redirects' => false,
                'proxy' => '',
            ])->timeout(10)->get($current);

            if (!$response->redirect()) {
                throw new RuntimeException(
                    'TikTok không trả về URL video hợp lệ.'
                );
            }

            $location = $response->header('Location');

            if (!is_string($location) || $location === '') {
                throw new RuntimeException(
                    'TikTok không trả về Location.'
                );
            }

            if (str_starts_with($location, '/')) {
                $location = 'https://'.strtolower($parts['host']).$location;
            }

            $current = $location;
        }

        throw new RuntimeException(
            'TikTok chuyển hướng quá 5 lần.'
        );
    }
}
