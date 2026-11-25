<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SePayAutomaticTopupTest extends TestCase
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
        User::factory()->create(['username' => 'autotester']);
    }

    private function send(int $id, int $amount = 50000, array $changes = [])
    {
        return $this->withHeader('Authorization', 'Apikey test-secret')
            ->postJson('/api/webhooks/sepay', array_merge([
                'id' => $id,
                'accountNumber' => '888838906789',
                'transferType' => 'in',
                'transferAmount' => $amount,
                'content' => 'NOSCAM autotester',
            ], $changes));
    }

    public function test_valid_transfer_creates_linked_pending_topup_without_credit(): void
    {
        $this->send(920001, 10000)->assertStatus(201);
        $topup = DB::table('wallet_topups')->where('code', 'SP-920001')->first();
        $this->assertNotNull($topup);
        $this->assertEquals(10000, $topup->amount);
        $this->assertSame('pending', $topup->status);
        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '920001',
            'wallet_topup_id' => $topup->id,
            'status' => 'matched',
        ]);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_duplicate_is_idempotent_and_conflict_rejected(): void
    {
        $this->send(920002)->assertStatus(201);
        $this->send(920002)->assertStatus(200);
        $this->send(920002, 70000)->assertStatus(409);
        $this->assertDatabaseCount('wallet_topups', 1);
        $this->assertDatabaseCount('bank_webhook_transactions', 1);
    }

    public function test_distinct_ids_with_same_content_create_two_topups(): void
    {
        $this->send(920003)->assertStatus(201);
        $this->send(920004)->assertStatus(201);
        $this->assertDatabaseCount('wallet_topups', 2);
    }

    public function test_invalid_transfers_never_create_topups(): void
    {
        $this->send(920005, 9999)->assertStatus(201);
        $this->send(920006, 50000, ['accountNumber' => 'WRONG'])->assertStatus(201);
        $this->send(920007, 50000, ['transferType' => 'out'])->assertStatus(201);
        $this->send(920008, 50000, ['content' => 'NOSCAM missing_user_xyz'])->assertStatus(201);
        $this->assertDatabaseCount('wallet_topups', 0);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_enabled_auto_credit_processes_once_and_repeated_delivery_is_safe(): void
    {
        config(['sepay.auto_credit_enabled' => true]);
        $this->send(920009, 50000)->assertStatus(201);
        $this->send(920009, 50000)->assertStatus(200);
        $this->assertDatabaseHas('wallet_topups', ['code' => 'SP-920009', 'status' => 'approved']);
        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '920009', 'status' => 'processed',
        ]);
        $this->assertDatabaseCount('wallet_transactions', 1);
        $this->assertDatabaseHas('wallet_transactions', ['type' => 'deposit', 'amount' => 50000]);
    }

    public function test_sevqr_transfer_auto_credits_exactly_once(): void
    {
        config(['sepay.auto_credit_enabled' => true]);

        $payload = ['content' => 'SEVQR NOSCAM autotester'];

        $this->send(920011, 10000, $payload)->assertStatus(201);
        $this->send(920011, 10000, $payload)->assertStatus(200);

        $this->assertDatabaseHas('wallet_topups', [
            'code' => 'SP-920011',
            'amount' => 10000,
            'status' => 'approved',
        ]);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '920011',
            'status' => 'processed',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 1);

        $this->assertDatabaseHas('wallet_transactions', [
            'type' => 'deposit',
            'amount' => 10000,
        ]);
    }

    public function test_tp_does_not_auto_credit_when_flag_enabled(): void
    {
        config(['sepay.auto_credit_enabled' => true]);
        $user = User::query()->where('username', 'autotester')->firstOrFail();
        DB::table('wallet_topups')->insert([
            'code' => 'TP-20261109120000-ABCDEF', 'user_id' => $user->id,
            'amount' => 50000, 'method' => 'bank_transfer', 'status' => 'pending',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->send(920010, 50000, ['content' => 'TP-20261109120000-ABCDEF'])->assertStatus(201);
        $this->assertDatabaseCount('wallet_transactions', 0);
        $this->assertDatabaseHas('wallet_topups', [
            'code' => 'TP-20261109120000-ABCDEF', 'status' => 'pending',
        ]);
    }

    public function test_historical_unmatched_webhook_is_never_recredited(): void
    {
        config(['sepay.auto_credit_enabled' => true]);

        $content = 'CT DEN:948T26B15MPDMXEM '
            .'MBVCB.17208068133.440899.SEVQR NOSCAM autotester'
            .'.CT tu 123456789 NGUYEN VAN A '
            .'toi 987654321 NGUYEN VAN B tai VIETINBANK';

        DB::table('bank_webhook_transactions')->insert([
            'provider' => 'sepay',
            'provider_transaction_id' => '929001',
            'bank_account' => '888838906789',
            'transfer_type' => 'in',
            'amount' => 50000,
            'transfer_content' => $content,
            'status' => 'unmatched',
            'wallet_topup_id' => null,
            'payload' => '{}',
            'error_message' => 'Historical unmatched transfer',
            'created_at' => now()->subDays(5),
            'updated_at' => now()->subDays(5),
        ]);

        $this->send(929001, 50000, [
            'content' => $content,
        ])->assertStatus(200);

        $this->assertDatabaseCount('wallet_topups', 0);
        $this->assertDatabaseCount('wallet_transactions', 0);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '929001',
            'status' => 'unmatched',
            'wallet_topup_id' => null,
        ]);
    }

    public function test_new_vcb_transfer_credits_exactly_once(): void
    {
        config(['sepay.auto_credit_enabled' => true]);

        $payload = [
            'content' => 'CT DEN:948T26B15MPDMXEM '
                .'MBVCB.17208068133.440899.SEVQR NOSCAM autotester'
                .'.CT tu 123456789 NGUYEN VAN A '
                .'toi 987654321 NGUYEN VAN B tai VIETINBANK',
        ];

        $this->send(929002, 45000, $payload)->assertStatus(201);
        $this->send(929002, 45000, $payload)->assertStatus(200);

        $this->assertDatabaseCount('wallet_topups', 1);
        $this->assertDatabaseCount('wallet_transactions', 1);

        $this->assertDatabaseHas('wallet_transactions', [
            'type' => 'deposit',
            'amount' => 45000,
        ]);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '929002',
            'status' => 'processed',
        ]);
    }

    public function test_new_timestamp_suffix_transfer_credits_once(): void
    {
        config(['sepay.auto_credit_enabled' => true]);

        $payload = [
            'content' => '948D6112403L4Y8S SEVQR NOSCAM '
                .'autotester-241126-20:51:18 6328ASCB02XG5DSD',
        ];

        $this->send(929003, 150000, $payload)->assertStatus(201);
        $this->send(929003, 150000, $payload)->assertStatus(200);

        $this->assertDatabaseCount('wallet_topups', 1);
        $this->assertDatabaseCount('wallet_transactions', 1);

        $this->assertDatabaseHas('wallet_transactions', [
            'type' => 'deposit',
            'amount' => 150000,
        ]);

        $this->assertDatabaseHas('bank_webhook_transactions', [
            'provider_transaction_id' => '929003',
            'status' => 'processed',
        ]);
    }

}
