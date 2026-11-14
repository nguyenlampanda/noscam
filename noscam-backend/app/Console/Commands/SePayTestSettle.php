<?php

namespace App\Console\Commands;

use App\Services\Social\SePaySettlementService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SePayTestSettle extends Command
{
    protected $signature = 'sepay:test-settle {webhookId}';

    protected $description = 'Test SePay settlement on isolated MySQL database';

    public function handle(SePaySettlementService $service): int
    {
        $db = DB::connection();

        $database = $db->selectOne(
            'SELECT DATABASE() AS name'
        )->name;

        $user = $db->selectOne(
            'SELECT CURRENT_USER() AS name'
        )->name;

        if (
            app()->environment() !== 'sepay-testing'
            || DB::getDefaultConnection() !== 'mysql'
            || $database !== 'noscam_sepay_concurrency_test'
            || $user !== 'noscam_sepay_test@localhost'
        ) {
            throw new RuntimeException(
                'TEST BLOCKED: Sai môi trường hoặc database.'
            );
        }

        config([
            'sepay.bank_account' => 'TEST123456',
            'sepay.auto_credit_enabled' => false,
        ]);

        $webhookId = filter_var(
            $this->argument('webhookId'),
            FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1]]
        );

        if ($webhookId === false) {
            throw new RuntimeException('Webhook ID không hợp lệ.');
        }

        $result = $service->settle($webhookId);

        $this->info(
            $result ? 'SETTLED' : 'ALREADY_PROCESSED'
        );

        return self::SUCCESS;
    }
}
