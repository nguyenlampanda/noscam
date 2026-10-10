<?php

namespace App\Console\Commands;

use App\Models\SocialOrder;
use Illuminate\Console\Command;

class AuditSocialOrders extends Command
{
    protected $signature = 'social:audit-orders
        {--limit=100 : Số đơn tối đa}';

    protected $description =
        'Liệt kê các đơn social cần đối soát thủ công';

    public function handle(): int
    {
        $limit = max(
            1,
            min(500, (int) $this->option('limit'))
        );

        $orders = SocialOrder::query()
            ->with('provider')
            ->where('status', 'pending')
            ->whereNull('provider_order_id')
            ->where('attempts', '>=', 1)
            ->orderBy('id')
            ->limit($limit)
            ->get();

        if ($orders->isEmpty()) {
            $this->info('Không có đơn cần đối soát.');
            return self::SUCCESS;
        }

        $this->table(
            [
                'Mã đơn',
                'Provider',
                'Attempts',
                'Số tiền',
                'Lỗi',
            ],
            $orders->map(fn ($order) => [
                $order->code,
                $order->provider?->name ?? '-',
                $order->attempts,
                number_format(
                    (float) $order->sell_amount,
                    0,
                    ',',
                    '.'
                ).'đ',
                mb_strimwidth(
                    (string) $order->provider_error,
                    0,
                    80,
                    '...'
                ),
            ])->all()
        );

        $this->warn(
            'Các đơn trên KHÔNG được tự gửi lại '
            .'hoặc hoàn tiền khi chưa đối soát Provider.'
        );

        return self::SUCCESS;
    }
}
