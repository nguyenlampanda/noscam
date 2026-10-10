<?php

namespace App\Console\Commands;

use App\Models\SocialOrder;
use App\Models\SocialOrderResolution;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SocialIntegrityCheck extends Command
{
    protected $signature = 'social:integrity-check';

    protected $description = 'Kiểm tra toàn vẹn dữ liệu Social, không chỉnh sửa';

    public function handle(): int
    {
        $issues = [];

        $duplicateProviders = DB::table('social_orders')
            ->select('social_provider_id', 'provider_order_id')
            ->whereNotNull('provider_order_id')
            ->groupBy('social_provider_id', 'provider_order_id')
            ->havingRaw('COUNT(*) > 1')
            ->count();

        if ($duplicateProviders > 0) {
            $issues[] = "Có {$duplicateProviders} nhóm mã Provider trùng.";
        }

        $overRefunded = SocialOrder::query()
            ->whereColumn('refunded_amount', '>', 'sell_amount')
            ->count();

        if ($overRefunded > 0) {
            $issues[] = "Có {$overRefunded} đơn hoàn tiền vượt giá bán.";
        }

        $duplicateResolutions = SocialOrderResolution::query()
            ->select('social_order_id')
            ->groupBy('social_order_id')
            ->havingRaw('COUNT(*) > 1')
            ->count();

        if ($duplicateResolutions > 0) {
            $issues[] = "Có {$duplicateResolutions} đơn có nhiều quyết định xử lý.";
        }

        $resolvedPending = SocialOrderResolution::query()
            ->join(
                'social_orders',
                'social_orders.id',
                '=',
                'social_order_resolutions.social_order_id'
            )
            ->where('social_orders.status', 'pending')
            ->count();

        if ($resolvedPending > 0) {
            $issues[] = "Có {$resolvedPending} đơn đã xử lý nhưng vẫn pending.";
        }

        if (!$issues) {
            $this->info('Không phát hiện bất thường trong các điều kiện đã kiểm tra.');
            return self::SUCCESS;
        }

        foreach ($issues as $issue) {
            $this->error($issue);
        }

        return self::FAILURE;
    }
}
