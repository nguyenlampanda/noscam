<?php

namespace App\Services\Social\Providers;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class VietnamFbV2Provider extends StandardSmmProvider
{
    public function createOrder(
        string $serviceId,
        string $target,
        int $quantity,
        array $options = []
    ): array {
        foreach (['key', 'action', 'service', 'link', 'quantity'] as $field) {
            if (array_key_exists($field, $options)) {
                throw new RuntimeException(
                    'Tuy chon don hang khong hop le: '.$field
                );
            }
        }

        return parent::createOrder(
            $serviceId,
            $target,
            $quantity,
            $options
        );
    }

    public function cancel(string $orderId): array
    {
        if ($orderId === '' || !ctype_digit($orderId)) {
            throw new RuntimeException('Ma don Provider khong hop le.');
        }

        if (blank($this->apiKey)) {
            throw new RuntimeException('Provider chưa có API key.');
        }

        // Cancel is non-idempotent: never retry an ambiguous request.
        $httpResponse = Http::asForm()
            ->acceptJson()
            ->timeout(30)
            ->post($this->apiUrl, [
                'key' => $this->apiKey,
                'action' => 'cancel',
                'orders' => $orderId,
            ]);

        $response = $httpResponse->json();

        if (!is_array($response)) {
            throw new RuntimeException(
                'Provider tra ve du lieu huy don khong hop le.'
            );
        }

        if (!$httpResponse->successful()) {
            throw new RuntimeException(
                'Provider HTTP error: '.$httpResponse->status()
            );
        }

        if (!empty($response['error'])) {
            throw new RuntimeException(
                'Provider tu choi yeu cau huy don.'
            );
        }

        $result = $response[0] ?? null;

        if (
            !is_array($result)
            || (string) ($result['order'] ?? '') !== $orderId
            || !in_array($result['cancel'] ?? null, [1, '1'], true)
        ) {
            throw new RuntimeException(
                'Provider chua xac nhan tiep nhan yeu cau huy don.'
            );
        }

        return $response;
    }
}
