<?php

namespace App\Services\Social\Providers;

use RuntimeException;

class BuffLikeNhanhV2Provider extends StandardSmmProvider
{
    public function createOrder(
        string $serviceId,
        string $target,
        int $quantity,
        array $options = []
    ): array {
        // Chưa gửi đơn thật cho đến khi hoàn tất kiểm thử.
        throw new RuntimeException(
            'BuffLikeNhanh V2 chưa được kích hoạt tạo đơn.'
        );
    }

    public function createVipOrder(
        string $serviceId,
        string $target,
        int $quantity,
        int $days,
        array $options = []
    ): array {
        throw new RuntimeException(
            'BuffLikeNhanh V2 chưa được kích hoạt tạo đơn VIP.'
        );
    }

    public function cancel(string $orderId): array
    {
        throw new RuntimeException(
            'Chưa xác nhận cơ chế hủy đơn BuffLikeNhanh V2.'
        );
    }

    public function refill(string $orderId): array
    {
        throw new RuntimeException(
            'Chưa xác nhận cơ chế bảo hành BuffLikeNhanh V2.'
        );
    }
}
