<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SePayWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'sepay.webhook_key' => 'test-secret-key',
            'sepay.bank_account' => 'TEST123456',
            'sepay.auto_credit_enabled' => false,
        ]);
    }

    private function payload(array $changes = []): array
    {
        return array_merge([
            'id' => 123456789,
            'accountNumber' => 'TEST123456',
            'transferType' => 'in',
            'transferAmount' => 100000,
            'content' => 'TP-20261109120000-ABCDEF',
            'transactionDate' => '2026-11-09 12:00:00',
        ], $changes);
    }

    private function send(array $payload, string $key = 'test-secret-key')
    {
        return $this->withHeader(
            'Authorization',
            'Apikey '.$key
        )->postJson('/api/webhooks/sepay', $payload);
    }

    public function test_invalid_key_is_rejected(): void
    {
        $this->send($this->payload(), 'wrong-key')
            ->assertStatus(401);

        $this->assertDatabaseCount(
            'bank_webhook_transactions',
            0
        );
    }

    public function test_valid_webhook_is_stored_without_credit(): void
    {
        $this->send($this->payload())
            ->assertStatus(201)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas(
            'bank_webhook_transactions',
            [
                'provider' => 'sepay',
                'provider_transaction_id' => '123456789',
                'status' => 'unmatched',
            ]
        );

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_duplicate_webhook_is_stored_once(): void
    {
        $this->send($this->payload())->assertStatus(201);
        $this->send($this->payload())->assertStatus(200);

        $this->assertDatabaseCount(
            'bank_webhook_transactions',
            1
        );
    }

    public function test_conflicting_duplicate_is_rejected(): void
    {
        $this->send($this->payload())->assertStatus(201);

        $this->send($this->payload([
            'transferAmount' => 200000,
        ]))->assertStatus(409);

        $this->assertDatabaseCount(
            'bank_webhook_transactions',
            1
        );

        $this->assertDatabaseHas(
            'bank_webhook_transactions',
            [
                'provider_transaction_id' => '123456789',
                'amount' => 100000,
            ]
        );
    }

    public function test_unknown_topup_is_unmatched(): void
    {
        $this->send($this->payload())->assertStatus(201);

        $this->assertDatabaseHas(
            'bank_webhook_transactions',
            [
                'provider_transaction_id' => '123456789',
                'status' => 'unmatched',
                'wallet_topup_id' => null,
            ]
        );

        $this->assertDatabaseCount('wallet_transactions', 0);
    }


    // NOSCAM_SEPAY_MATCH_TESTS_V1

    private function createPendingTopup(
        string $code = 'TP-20261109120000-ABCDEF',
        int $amount = 100000,
        string $status = 'pending'
    ): int {
        $user = \App\Models\User::factory()->create();

        return DB::table('wallet_topups')->insertGetId([
            'code' => $code,
            'user_id' => $user->id,
            'amount' => $amount,
            'method' => 'bank_transfer',
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_matching_topup_is_marked_matched_without_credit(): void
    {
        $topupId = $this->createPendingTopup();

        $this->send($this->payload())->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '123456789',
            'wallet_topup_id' => $topupId,
            'status' => 'matched',
        ]);

        $this->assertDatabaseHas('wallet_topups', [
            'id' => $topupId,
            'status' => 'pending',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_wrong_amount_is_unmatched_without_credit(): void
    {
        $this->createPendingTopup();

        $this->send($this->payload([
            'transferAmount' => 90000,
        ]))->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '123456789',
            'wallet_topup_id' => null,
            'status' => 'unmatched',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_cancelled_topup_is_unmatched(): void
    {
        $topupId = $this->createPendingTopup(
            status: 'cancelled'
        );

        $this->send($this->payload())->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '123456789',
            'wallet_topup_id' => null,
            'status' => 'unmatched',
        ]);

        $this->assertDatabaseHas('wallet_topups', [
            'id' => $topupId,
            'status' => 'cancelled',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_two_topup_codes_are_unmatched(): void
    {
        $this->createPendingTopup();

        $this->send($this->payload([
            'content' => 'TP-20261109120000-ABCDEF TP-20261109120100-UVWXYZ',
        ]))->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '123456789',
            'wallet_topup_id' => null,
            'status' => 'unmatched',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_wrong_bank_account_is_unmatched(): void
    {
        $this->send($this->payload([
            'accountNumber' => 'WRONGACCOUNT',
        ]))->assertStatus(201);

        $this->assertDatabaseHas(
            'bank_webhook_transactions',
            [
                'provider_transaction_id' => '123456789',
                'status' => 'unmatched',
            ]
        );

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_outgoing_transfer_is_unmatched(): void
    {
        $this->send($this->payload([
            'transferType' => 'out',
        ]))->assertStatus(201);

        $this->assertDatabaseHas(
            'bank_webhook_transactions',
            [
                'provider_transaction_id' => '123456789',
                'status' => 'unmatched',
            ]
        );
    }
}
