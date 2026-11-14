<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SePayMinimumTopupTest extends TestCase
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

        User::factory()->create([
            'username' => 'minimumtester',
        ]);
    }

    private function sendTransfer(int $id, int $amount)
    {
        return $this->withHeader(
            'Authorization',
            'Apikey test-secret'
        )->postJson('/api/webhooks/sepay', [
            'id' => $id,
            'accountNumber' => '888838906789',
            'transferType' => 'in',
            'transferAmount' => $amount,
            'content' => 'NOSCAM minimumtester',
        ]);
    }

    public function test_9999_vnd_is_not_eligible(): void
    {
        $this->sendTransfer(910001, 9999)->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '910001',
            'status' => 'unmatched',
        ]);

        $this->assertDatabaseCount('wallet_topups', 0);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_10000_vnd_is_accepted_for_review(): void
    {
        $this->sendTransfer(910002, 10000)->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '910002',
            'status' => 'matched',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_50000_vnd_is_accepted_for_review(): void
    {
        $this->sendTransfer(910003, 50000)->assertStatus(201);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '910003',
            'status' => 'matched',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
    }
}
