<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Social\SePaySettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

class SePaySettlementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'sepay.bank_account' => 'TEST123456',
            'sepay.auto_credit_enabled' => false,
        ]);
    }

    private function makeMatched(
        string $transactionId = '123456789',
        ?int $topupId = null
    ): array {
        if ($topupId === null) {
            $user = User::factory()->create();

            $topupId = DB::table('wallet_topups')
                ->insertGetId([
                    'code' => 'TP-20261109120000-ABCDEF',
                    'user_id' => $user->id,
                    'amount' => 100000,
                    'method' => 'bank_transfer',
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        $webhookId = DB::table('bank_webhook_transactions')
            ->insertGetId([
                'provider' => 'sepay',
                'provider_transaction_id' => $transactionId,
                'bank_account' => 'TEST123456',
                'transfer_type' => 'in',
                'amount' => 100000,
                'transfer_content' => 'TP-20261109120000-ABCDEF',
                'status' => 'matched',
                'wallet_topup_id' => $topupId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        return [$topupId, $webhookId];
    }

    public function test_valid_settlement_credits_once(): void
    {
        [$topupId, $webhookId] = $this->makeMatched();

        $service = app(SePaySettlementService::class);

        $this->assertTrue($service->settle($webhookId));

        $this->assertDatabaseHas('wallet_topups', [
            'id' => $topupId,
            'status' => 'approved',
        ]);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'id' => $webhookId,
            'status' => 'processed',
        ]);

        $this->assertDatabaseHas('wallet_transactions', [
            'reference_id' => $topupId,
            'type' => 'deposit',
            'amount' => 100000,
        ]);

        $this->assertDatabaseCount('wallet_transactions', 1);
    }

    public function test_repeated_settlement_does_not_credit_twice(): void
    {
        [, $webhookId] = $this->makeMatched();

        $service = app(SePaySettlementService::class);

        $this->assertTrue($service->settle($webhookId));
        $this->assertFalse($service->settle($webhookId));

        $this->assertDatabaseCount('wallet_transactions', 1);
    }

    public function test_unmatched_transaction_cannot_credit(): void
    {
        [, $webhookId] = $this->makeMatched();

        DB::table('bank_webhook_transactions')
            ->where('id', $webhookId)
            ->update(['status' => 'unmatched']);

        $this->expectException(RuntimeException::class);

        try {
            app(SePaySettlementService::class)->settle($webhookId);
        } finally {
            $this->assertDatabaseCount('wallet_transactions', 0);
        }
    }

    public function test_two_bank_transactions_cannot_credit_same_topup(): void
    {
        [$topupId, $firstId] = $this->makeMatched();

        [, $secondId] = $this->makeMatched(
            transactionId: '987654321',
            topupId: $topupId
        );

        $service = app(SePaySettlementService::class);

        $this->assertTrue($service->settle($firstId));

        try {
            $service->settle($secondId);
            $this->fail('Phải từ chối nạp trùng.');
        } catch (RuntimeException $exception) {
            $this->assertDatabaseCount('wallet_transactions', 1);
        }
    }

    // NOSCAM_SEPAY_SECURITY_TESTS_V1

    public function test_wrong_transfer_code_cannot_credit(): void
    {
        [$topupId, $webhookId] = $this->makeMatched();

        DB::table('bank_webhook_transactions')
            ->where('id', $webhookId)
            ->update([
                'transfer_content' =>
                    'TP-20261109120000-ZZZZZZ',
            ]);

        try {
            app(SePaySettlementService::class)->settle($webhookId);
            $this->fail('Phải từ chối mã nạp không khớp.');
        } catch (RuntimeException $exception) {
            $this->assertDatabaseHas('wallet_topups', [
                'id' => $topupId,
                'status' => 'pending',
            ]);

            $this->assertDatabaseCount('wallet_transactions', 0);
        }
    }

    public function test_fractional_amount_cannot_credit(): void
    {
        [$topupId, $webhookId] = $this->makeMatched();

        DB::table('bank_webhook_transactions')
            ->where('id', $webhookId)
            ->update(['amount' => '100000.5000']);

        try {
            app(SePaySettlementService::class)->settle($webhookId);
            $this->fail('Phải từ chối số tiền lẻ.');
        } catch (RuntimeException $exception) {
            $this->assertDatabaseHas('wallet_topups', [
                'id' => $topupId,
                'status' => 'pending',
            ]);

            $this->assertDatabaseCount('wallet_transactions', 0);
        }
    }

    public function test_two_transfer_codes_cannot_credit(): void
    {
        [, $webhookId] = $this->makeMatched();

        DB::table('bank_webhook_transactions')
            ->where('id', $webhookId)
            ->update([
                'transfer_content' =>
                    'TP-20261109120000-ABCDEF '
                    .'TP-20261109120100-UVWXYZ',
            ]);

        try {
            app(SePaySettlementService::class)->settle($webhookId);
            $this->fail('Phải từ chối hai mã nạp.');
        } catch (RuntimeException $exception) {
            $this->assertDatabaseCount('wallet_transactions', 0);
        }
    }

    public function test_approved_topup_cannot_credit_again(): void
    {
        [$topupId, $webhookId] = $this->makeMatched();

        DB::table('wallet_topups')
            ->where('id', $topupId)
            ->update(['status' => 'approved']);

        try {
            app(SePaySettlementService::class)->settle($webhookId);
            $this->fail('Phải từ chối topup đã duyệt.');
        } catch (RuntimeException $exception) {
            $this->assertDatabaseCount('wallet_transactions', 0);
        }
    }



    // NOSCAM_SEPAY_ROLLBACK_TEST_V1

    public function test_credit_failure_rolls_back_entire_settlement(): void
    {
        [$topupId, $webhookId] = $this->makeMatched();

        $walletService = \Mockery::mock(
            \App\Services\Social\WalletService::class
        );

        $walletService->shouldReceive('credit')
            ->once()
            ->andThrow(
                new RuntimeException('Simulated wallet failure')
            );

        $this->app->instance(
            \App\Services\Social\WalletService::class,
            $walletService
        );

        try {
            app(SePaySettlementService::class)->settle($webhookId);
            $this->fail('Settlement phải thất bại.');
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Simulated wallet failure',
                $exception->getMessage()
            );
        }

        $this->assertDatabaseHas('wallet_topups', [
            'id' => $topupId,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'id' => $webhookId,
            'status' => 'matched',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
        $this->assertDatabaseCount('wallets', 0);
    }


    // NOSCAM_SEPAY_POST_CREDIT_ROLLBACK_V1

    public function test_failure_after_wallet_credit_rolls_back_balance(): void
    {
        [$topupId, $webhookId] = $this->makeMatched();

        $realWalletService = new \App\Services\Social\WalletService();

        $walletService = \Mockery::mock(
            \App\Services\Social\WalletService::class
        );

        $walletService->shouldReceive('credit')
            ->once()
            ->andReturnUsing(
                function (...$arguments) use ($realWalletService) {
                    $realWalletService->credit(...$arguments);

                    throw new RuntimeException(
                        'Simulated failure after wallet credit'
                    );
                }
            );

        $this->app->instance(
            \App\Services\Social\WalletService::class,
            $walletService
        );

        try {
            app(SePaySettlementService::class)->settle($webhookId);

            $this->fail(
                'Settlement phải thất bại sau khi cộng tiền.'
            );
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Simulated failure after wallet credit',
                $exception->getMessage()
            );
        }

        $this->assertDatabaseHas('wallet_topups', [
            'id' => $topupId,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'id' => $webhookId,
            'status' => 'matched',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
        $this->assertDatabaseCount('wallets', 0);
    }

}
