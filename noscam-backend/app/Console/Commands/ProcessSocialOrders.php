<?php

namespace App\Console\Commands;

use App\Models\SocialOrder;
use App\Services\Social\SocialOrderProviderService;
use Illuminate\Console\Command;
use Throwable;

class ProcessSocialOrders extends Command
{
    protected $signature =
        'social:process-orders
        {--limit=50 : Số đơn tối đa mỗi lượt}';

    protected $description =
        'Gửi đơn social và đồng bộ trạng thái provider';

    public function handle(
        SocialOrderProviderService $providerService
    ): int {
        $limit = max(
            1,
            min(
                200,
                (int) $this->option('limit')
            )
        );

        /*
         * SUBMIT
         *
         * Chỉ retry tối đa 3 lần.
         * Chỉ provider đã xác nhận chuẩn SMM V2.
         */
        $pendingOrders =
            SocialOrder::query()
                ->with([
                    'provider',
                    'providerService',
                ])
                ->where(
                    'status',
                    'pending'
                )
                ->whereNull(
                    'provider_order_id'
                )
                ->where(
                    'attempts',
                    '<',
                    3
                )
                ->whereHas(
                    'provider',
                    function ($query) {
                        $query
                            ->where(
                                'status',
                                'active'
                            )
                            ->whereIn(
                                'driver',
                                [
                                    'nganhangsub',
                                    'hacklike17',
                                ]
                            );
                    }
                )
                ->orderBy('id')
                ->limit($limit)
                ->get();

        foreach ($pendingOrders as $order) {
            try {
                $result =
                    $providerService->submit(
                        $order
                    );

                $this->info(
                    $result->code
                    .' -> submitted'
                    .' -> '
                    .$result->provider_order_id
                );
            } catch (Throwable $e) {
                $this->error(
                    $order->code
                    .' -> submit error: '
                    .$e->getMessage()
                );
            }
        }

        /*
         * SYNC
         *
         * Chỉ sync đơn đang chạy.
         * Không đụng completed/partial/
         * cancelled/failed.
         */
        $syncOrders =
            SocialOrder::query()
                ->with([
                    'provider',
                    'providerService',
                ])
                ->whereNotNull(
                    'provider_order_id'
                )
                ->whereIn(
                    'status',
                    [
                        'processing',
                        'in_progress',
                    ]
                )
                ->where(
                    function ($query) {
                        $query
                            ->whereNull(
                                'last_synced_at'
                            )
                            ->orWhere(
                                'last_synced_at',
                                '<=',
                                now()->subSeconds(45)
                            );
                    }
                )
                ->whereHas(
                    'provider',
                    function ($query) {
                        $query
                            ->where(
                                'status',
                                'active'
                            )
                            ->whereIn(
                                'driver',
                                [
                                    'nganhangsub',
                                    'hacklike17',
                                ]
                            );
                    }
                )
                ->orderByRaw(
                    'COALESCE(last_synced_at, created_at) ASC'
                )
                ->limit($limit)
                ->get();

        foreach ($syncOrders as $order) {
            try {
                $result =
                    $providerService->sync(
                        $order
                    );

                $this->line(
                    $result->code
                    .' -> '
                    .$result->status
                );
            } catch (Throwable $e) {
                $this->error(
                    $order->code
                    .' -> sync error: '
                    .$e->getMessage()
                );
            }
        }

        return self::SUCCESS;
    }
}
