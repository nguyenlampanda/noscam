<?php

namespace App\Services\Social\Providers;

use App\Services\Social\SocialProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class VietnamFbProvider implements SocialProviderInterface
{
    public function __construct(
        protected string $apiUrl,
        protected string $apiKey,
        protected ?string $username = null
    ) {
    }

    protected function endpoint(): string
    {
        $url = rtrim($this->apiUrl, '/');

        if (!str_ends_with($url, '/api')) {
            $url .= '/api';
        }

        return $url;
    }

    protected function get(
        string $mc,
        string $site,
        array $params = []
    ): array {
        $response = Http::acceptJson()
            ->timeout(30)
            ->retry(2, 500)
            ->get(
                $this->endpoint(),
                array_merge([
                    'mc' => $mc,
                    'site' => $site,
                    'api_key' => $this->apiKey,
                ], $params)
            );

        return $this->parseResponse($response);
    }

    protected function post(
        string $mc,
        string $site,
        array $data = []
    ): array {
        $response = Http::asForm()
            ->acceptJson()
            ->timeout(30)
            ->post(
                rtrim($this->apiUrl, '/').'?'.http_build_query([
                    'mc' => $mc,
                    'site' => $site,
                    'api_key' => $this->apiKey,
                ]),
                $data
            );

        return $this->parseResponse($response);
    }

    protected function parseResponse($response): array
    {
        if (!$response->successful()) {
            throw new RuntimeException(
                'VietnamFB HTTP error: '.$response->status()
            );
        }

        $body = trim($response->body());
        $lower = strtolower($body);

        if (
            str_contains($lower, '<html') ||
            str_contains($lower, '<script')
        ) {
            throw new RuntimeException(
                'VietnamFB trả về HTML/login page.'
            );
        }

        $json = $response->json();

        if (!is_array($json)) {
            throw new RuntimeException(
                'VietnamFB response không hợp lệ.'
            );
        }

        if (
            isset($json['success']) &&
            (int) $json['success'] === 0
        ) {
            throw new RuntimeException(
                (string) (
                    $json['message']
                    ?? 'VietnamFB API báo lỗi.'
                )
            );
        }

        return $json;
    }

    public function balance(): array
    {
        return $this->get(
            'user',
            'get_user_balance'
        );
    }

    public function services(): array
    {
        $username = trim(
            (string) $this->username
        );

        if ($username === '') {
            throw new RuntimeException(
                'VietnamFB chưa cấu hình username.'
            );
        }

        $result = $this->get(
            'channel',
            'get_channel_info',
            [
                'username' => $username,
            ]
        );

        $services = [];

        foreach ($result as $group => $channels) {
            if (!is_array($channels)) {
                continue;
            }

            foreach ($channels as $channel) {
                if (!is_array($channel)) {
                    continue;
                }

                $channelNumber =
                    $channel['channel']
                    ?? $channel['id']
                    ?? null;

                if ($channelNumber === null) {
                    continue;
                }

                $groupName = strtoupper(
                    (string) $group
                );

                $channelId = (string) $channelNumber;

                $statusText = (string) (
                    $channel['status_text']
                    ?? ''
                );

                $services[] = [
                    'service' =>
                        $groupName.':'.$channelId,

                    'name' =>
                        $this->serviceName(
                            $groupName,
                            $channelId
                        ),

                    'rate' =>
                        is_numeric(
                            $channel['price'] ?? null
                        )
                            ? (float) $channel['price']
                            : 0,

                    'min' =>
                        is_numeric($channel['min'] ?? null)
                        && (int) $channel['min'] > 0
                            ? (int) $channel['min']
                            : 1,

                    'max' =>
                        is_numeric($channel['max'] ?? null)
                        && (int) $channel['max'] > 0
                            ? (int) $channel['max']
                            : 1000000,

                    'min_verified' =>
                        is_numeric($channel['min'] ?? null)
                        && (int) $channel['min'] > 0,

                    'max_verified' =>
                        is_numeric($channel['max'] ?? null)
                        && (int) $channel['max'] > 0,

                    'group' => $groupName,

                    'channel' => $channelId,

                    'status_text' => $statusText,

                    'provider_active' =>
                        $this->isChannelActive(
                            $channel
                        ),

                    'provider_data' => $channel,
                ];
            }
        }

        return $services;
    }

    protected function serviceName(
        string $group,
        string $channel
    ): string {
        $label = str_replace(
            '_',
            ' ',
            $group
        );

        return trim(
            $label.' - Kênh '.$channel
        );
    }

    protected function isChannelActive(
        array $channel
    ): bool {
        $status = strtolower(
            trim(
                (string) (
                    $channel['status_text']
                    ?? $channel['status']
                    ?? ''
                )
            )
        );

        if ($status === '') {
            return true;
        }

        foreach ([
            'tắt',
            'tat',
            'ngưng',
            'ngung',
            'bảo trì',
            'bao tri',
            'off',
            'inactive',
            'disabled',
        ] as $word) {
            if (str_contains($status, $word)) {
                return false;
            }
        }

        return true;
    }

    public function createOrder(
        string $serviceId,
        string $target,
        int $quantity,
        array $options = []
    ): array {
        $parts = explode(':', $serviceId, 2);

        if (count($parts) !== 2) {
            throw new RuntimeException(
                'VietnamFB service ID không hợp lệ: '.$serviceId
            );
        }

        [$group, $channel] = $parts;

        $group = strtoupper(trim($group));
        $channel = trim($channel);

        if ($channel === '' || !ctype_digit($channel)) {
            throw new RuntimeException(
                'VietnamFB channel_number không hợp lệ.'
            );
        }

        $routes = [
            'BUFF_LIKE' => 'buff',
            'BUFF_COMMENT' => 'buff_comment',
            'BUFF_LIVE' => 'buff_live',
            'TIKTOK_VIEW' => 'tiktok_view',
            'TIKTOK_SUB' => 'tiktok_sub',
        ];

        if (!isset($routes[$group])) {
            throw new RuntimeException(
                'VietnamFB chưa hỗ trợ tạo đơn nhóm: '.$group
            );
        }

        $payload = [
            'amount' => $quantity,
            'channel_number' => $channel,
        ];

        if (str_starts_with($group, 'TIKTOK_')) {
            $payload['link'] = $target;
        } else {
            $payload['id'] = $target;
        }

        if ($group === 'BUFF_LIKE') {
            $payload['reaction'] = $options['reaction'] ?? 'LIKE';
        }

        if ($group === 'BUFF_COMMENT') {
            throw new RuntimeException(
                'BUFF_COMMENT cần nội dung bình luận riêng.'
            );
        }

        if ($group === 'BUFF_LIVE') {
            throw new RuntimeException(
                'BUFF_LIVE cần tham số mins.'
            );
        }

        if ($group === 'TIKTOK_SUB') {
            throw new RuntimeException(
                'TIKTOK_SUB cần package_type.'
            );
        }

        return $this->post(
            $routes[$group],
            'create',
            array_merge($payload, $options['payload'] ?? [])
        );
    }

    public function orderStatus(
        string $orderId
    ): array {
        throw new RuntimeException(
            'VietnamFB chưa cấu hình lấy trạng thái đơn.'
        );
    }

    public function refill(
        string $orderId
    ): array {
        throw new RuntimeException(
            'VietnamFB chưa cấu hình refill.'
        );
    }

    public function cancel(
        string $orderId
    ): array {
        throw new RuntimeException(
            'VietnamFB chưa cấu hình cancel.'
        );
    }
}
