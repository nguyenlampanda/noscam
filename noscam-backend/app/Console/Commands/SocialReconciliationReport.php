<?php

namespace App\Console\Commands;

use App\Models\SocialOrder;
use App\Models\SocialOrderAudit;
use App\Models\SocialOrderResolution;
use Illuminate\Console\Command;

class SocialReconciliationReport extends Command
{
    protected $signature = 'social:reconciliation-report';

    protected $description = 'Báo cáo đối soát đơn Social, chỉ đọc dữ liệu';

    public function handle(): int
    {
        $orders = SocialOrder::query()
            ->where('status', 'pending')
            ->whereNull('provider_order_id')
            ->where('attempts', '>=', 1)
            ->get();

        $this->info('Tổng đơn cần đối soát: '.$orders->count());

        $rows = [];

        foreach ($orders as $order) {
            $audit = SocialOrderAudit::query()
                ->where('social_order_id', $order->id)
                ->latest('id')
                ->first();

            $resolved = SocialOrderResolution::query()
                ->where('social_order_id', $order->id)
                ->exists();

            $rows[] = [
                $order->code,
                $order->status,
                $order->attempts,
                $audit?->result ?? 'Chưa có',
                $resolved ? 'Có' : 'Không',
            ];
        }

        if ($rows) {
            $this->table(
                ['Mã đơn', 'Trạng thái', 'Attempts', 'Biên bản mới nhất', 'Đã xử lý'],
                $rows
            );
        }

        return self::SUCCESS;
    }
}
