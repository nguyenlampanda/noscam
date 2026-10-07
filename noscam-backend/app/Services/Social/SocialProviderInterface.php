<?php

namespace App\Services\Social;

interface SocialProviderInterface
{
    public function balance(): array;

    public function services(): array;

    public function createOrder(
        string $serviceId,
        string $target,
        int $quantity,
        array $options = []
    ): array;

    public function orderStatus(
        string $orderId
    ): array;

    public function refill(
        string $orderId
    ): array;

    public function cancel(
        string $orderId
    ): array;
}
