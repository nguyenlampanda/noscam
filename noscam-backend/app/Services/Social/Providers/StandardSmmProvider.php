<?php

namespace App\Services\Social\Providers;

use App\Services\Social\SocialProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class StandardSmmProvider implements SocialProviderInterface
{
    public function __construct(
        protected string $apiUrl,
        protected string $apiKey
    ) {
    }

    protected function request(array $data): array
    {
        if (blank($this->apiKey)) {
            throw new RuntimeException(
                'Provider chưa có API key.'
            );
        }

        $response = Http::asForm()
            ->acceptJson()
            ->timeout(30)
            ->retry(2, 500)
            ->post(
                $this->apiUrl,
                array_merge(
                    [
                        'key' => $this->apiKey,
                    ],
                    $data
                )
            );

        $json = $response->json();

        if (!is_array($json)) {
            throw new RuntimeException(
                'Provider trả về dữ liệu không hợp lệ.'
            );
        }

        if (!$response->successful()) {
            throw new RuntimeException(
                $json['error']
                    ?? $json['message']
                    ?? (
                        'Provider HTTP error: '
                        . $response->status()
                    )
            );
        }

        // API V2 có thể trả HTTP 200
        // nhưng body vẫn chứa error.
        if (!empty($json['error'])) {
            throw new RuntimeException(
                (string) $json['error']
            );
        }

        return $json;
    }

    public function balance(): array
    {
        return $this->request([
            'action' => 'balance',
        ]);
    }

    public function services(): array
    {
        return $this->request([
            'action' => 'services',
        ]);
    }

    public function createOrder(
        string $serviceId,
        string $target,
        int $quantity,
        array $options = []
    ): array {
        $payload = [
            'action' => 'add',
            'service' => $serviceId,
            'link' => $target,
            'quantity' => $quantity,
        ];

        // Các field đặc biệt như:
        // comments, reaction, video_length,
        // minutes, owner_link, note...
        foreach ($options as $key => $value) {
            if (
                $value !== null
                && $value !== ''
            ) {
                $payload[$key] = $value;
            }
        }

        return $this->request(
            $payload
        );
    }

    public function orderStatus(
        string $orderId
    ): array {
        return $this->request([
            'action' => 'status',
            'order' => $orderId,
        ]);
    }

    public function refill(
        string $orderId
    ): array {
        return $this->request([
            'action' => 'refill',
            'order' => $orderId,
        ]);
    }

    public function cancel(
        string $orderId
    ): array {
        return $this->request([
            'action' => 'cancel',
            'order' => $orderId,
        ]);
    }

    public function numericFacebookUid(
        string $link
    ): array {
        return $this->request([
            'action' => 'get_numeric_uid',
            'link' => $link,
        ]);
    }

    public function createVipOrder(
        string $serviceId,
        string $target,
        int $quantity,
        int $days,
        array $options = []
    ): array {
        return $this->request(
            array_merge(
                [
                    'action' => 'add_vip',
                    'service' => $serviceId,
                    'link' => $target,
                    'quantity' => $quantity,
                    'days' => $days,
                ],
                $options
            )
        );
    }
}
