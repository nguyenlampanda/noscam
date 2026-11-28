<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\Social\ProviderWalletBalanceService;

class SyncProviderWalletBalances extends Command
{
    protected $signature = 'social:sync-wallet-balances';

    protected $description =
        'Đồng bộ số dư các ví API đang hoạt động';

    public function handle(
        ProviderWalletBalanceService $service
    ): int {
        $results = $service->sync();

        $failed = false;

        foreach ($results as $group => $result) {
            if ($result['success']) {
                $this->info(
                    $group . ': ' .
                    number_format(
                        $result['balance_vnd'],
                        0,
                        ',',
                        '.'
                    ) . ' VND'
                );
            } else {
                $failed = true;
                $this->warn(
                    $group . ': Không thể đồng bộ'
                );
            }
        }

        return $failed
            ? self::FAILURE
            : self::SUCCESS;
    }
}
