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
            ->retry(2, 500)
            ->post(
                $this->endpoint().'?'.http_build_query([
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
                        is_numeric(
                            $channel['min'] ?? null
                        )
                            ? (int) $channel['min']
                            : 1,

                    'max' =>
                        is_numeric(
                            $channel['max'] ?? null
                        )
                            ? (int) $channel['max']
                            : 1000000,

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
        return $this->post(
            $options['mc'] ?? 'buff',
            'create',
            array_merge([
                'id' => $target,
                'amount' => $quantity,
            ], $options['payload'] ?? [])
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
