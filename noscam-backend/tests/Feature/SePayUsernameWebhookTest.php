<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SePayUsernameWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'sepay.webhook_key' => 'test-secret',
            'sepay.bank_account' => '888838906789',
            'sepay.auto_credit_enabled' => false,
        ]);
    }

    private function sendTransfer(
        int $id,
        string $content,
        int $amount = 50000
    ) {
        return $this->withHeader(
            'Authorization',
            'Apikey test-secret'
        )->postJson('/api/webhooks/sepay', [
            'id' => $id,
            'accountNumber' => '888838906789',
            'transferType' => 'in',
            'transferAmount' => $amount,
            'content' => $content,
        ]);
    }

    public function test_known_username_is_recorded_without_credit(): void
    {
        User::factory()->create(['username' => 'sepaytester']);

        $this->sendTransfer(
            900001,
            'NOSCAM sepaytester'
        )->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '900001',
            'status' => 'matched',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_unknown_username_is_unmatched(): void
    {
        $this->sendTransfer(
            900002,
            'NOSCAM nonexistent_user_987654'
        )->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '900002',
            'status' => 'unmatched',
        ]);
    }

    public function test_duplicate_transaction_is_recorded_once(): void
    {
        User::factory()->create(['username' => 'sepaytester']);

        $this->sendTransfer(
            900003,
            'NOSCAM sepaytester'
        )->assertStatus(201);

        $this->sendTransfer(
            900003,
            'NOSCAM sepaytester'
        )->assertStatus(200);

        $this->assertDatabaseCount('bank_webhook_transactions', 1);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_distinct_transactions_are_both_recorded(): void
    {
        User::factory()->create(['username' => 'sepaytester']);

        $this->sendTransfer(
            900004,
            'NOSCAM sepaytester'
        )->assertStatus(201);

        $this->sendTransfer(
            900005,
            'NOSCAM sepaytester',
            70000
        )->assertStatus(201);

        $this->assertDatabaseCount('bank_webhook_transactions', 2);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }
}
