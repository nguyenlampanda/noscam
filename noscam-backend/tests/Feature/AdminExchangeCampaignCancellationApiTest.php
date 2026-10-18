<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminExchangeCampaignCancellationApiTest extends TestCase
{
    use RefreshDatabase;

    private function endpoint(string $action): string
    {
        return '/api/admin/exchange/campaigns/999999/'.$action;
    }

    private function payload(): array
    {
        return [
            'reason' => 'Kiểm thử yêu cầu hủy chiến dịch.',
            'confirm' => true,
        ];
    }

    public function test_guest_cannot_request_cancellation(): void
    {
        $this->postJson(
            $this->endpoint('cancel-request'),
            $this->payload()
        )->assertUnauthorized();
    }

    public function test_guest_cannot_finalize_cancellation(): void
    {
        $this->postJson(
            $this->endpoint('cancel-finalize'),
            $this->payload()
        )->assertUnauthorized();
    }

    public function test_customer_cannot_use_cancellation_apis(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'sanctum');

        foreach (['cancel-request', 'cancel-finalize'] as $action) {
            $this->postJson(
                $this->endpoint($action),
                $this->payload()
            )->assertForbidden();
        }
    }

    public function test_moderator_cannot_use_cancellation_apis(): void
    {
        $moderator = User::factory()->create([
            'role' => 'moderator',
        ]);

        $this->actingAs($moderator, 'sanctum');

        foreach (['cancel-request', 'cancel-finalize'] as $action) {
            $this->postJson(
                $this->endpoint($action),
                $this->payload()
            )->assertForbidden();
        }
    }

    public function test_admin_request_requires_valid_reason(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum');

        foreach (['', 'short'] as $reason) {
            $this->postJson(
                $this->endpoint('cancel-request'),
                ['reason' => $reason]
            )->assertUnprocessable();
        }
    }

    public function test_admin_request_requires_confirmation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum');

        foreach ([false, null] as $confirm) {
            $this->postJson(
                $this->endpoint('cancel-request'),
                [
                    'reason' => 'Kiểm thử bắt buộc xác nhận hoàn xu.',
                    'confirm' => $confirm,
                ]
            )->assertUnprocessable();
        }
    }

    public function test_admin_finalize_requires_confirmation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum');

        foreach ([false, null] as $confirm) {
            $this->postJson(
                $this->endpoint('cancel-finalize'),
                [
                    'reason' => 'Kiểm thử xác nhận hoàn xu.',
                    'confirm' => $confirm,
                ]
            )->assertUnprocessable();
        }
    }

    public function test_admin_http_cancellation_refunds_once(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        $wallet = \App\Models\Wallet::create([
            'user_id' => $owner->id,
            'balance' => 20000,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $campaign = \App\Models\ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/testtarget/',
            'quantity' => 10,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 20000,
            'budget_held' => 0,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => 'draft',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);

        app(\App\Services\Exchange\ExchangeEscrowService::class)
            ->holdCampaignBudget($campaign);

        $campaign->refresh();
        $campaign->status = 'active';
        $campaign->save();

        $this->assertEquals(0, $wallet->fresh()->balance);

        $this->actingAs($admin, 'sanctum');

        $base = '/api/admin/exchange/campaigns/'.$campaign->id;

        $payload = [
            'reason' => 'Admin xác nhận hủy và hoàn ngân sách kiểm thử.',
            'confirm' => true,
        ];

        $this->postJson($base.'/cancel-request', $payload)
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.refunded_now', 20000);

        $this->assertSame('cancelled', $campaign->fresh()->status);
        $this->assertEquals(20000, $wallet->fresh()->balance);
        $this->assertEquals(0, $campaign->fresh()->budget_held);
        $this->assertEquals(20000, $campaign->fresh()->budget_refunded);

        $beforeTransactions = \App\Models\WalletTransaction::count();
        $beforeEscrow = \App\Models\ExchangeEscrowEntry::count();

        $this->postJson($base.'/cancel-request', $payload)
            ->assertOk()
            ->assertJsonPath('data.already_cancelled', true)
            ->assertJsonPath('data.refunded_now', 0);

        $this->assertEquals(20000, $wallet->fresh()->balance);
        $this->assertSame(
            $beforeTransactions,
            \App\Models\WalletTransaction::count()
        );
        $this->assertSame(
            $beforeEscrow,
            \App\Models\ExchangeEscrowEntry::count()
        );
    }


    public function test_http_finalize_rejects_pending_claim_without_refund(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $worker = User::factory()->create();

        $wallet = \App\Models\Wallet::create([
            'user_id' => $owner->id,
            'balance' => 20000,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $campaign = \App\Models\ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/testtarget/',
            'quantity' => 10,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 20000,
            'budget_held' => 0,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => 'draft',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);

        app(\App\Services\Exchange\ExchangeEscrowService::class)
            ->holdCampaignBudget($campaign);

        $campaign->refresh();
        $campaign->status = 'active';
        $campaign->save();

        $account = \App\Models\ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => 'pending_cancel_worker',
            'normalized_username' => 'pending_cancel_worker',
            'profile_url' =>
                'https://www.instagram.com/pending_cancel_worker/',
            'is_default' => true,
            'is_active' => true,
        ]);

        \App\Models\ExchangeTaskClaim::create([
            'campaign_id' => $campaign->id,
            'worker_user_id' => $worker->id,
            'social_account_id' => $account->id,
            'status' => 'claimed',
            'claimed_at' => now(),
            'risk_hold' => false,
        ]);

        $this->actingAs($admin, 'sanctum');

        $base = '/api/admin/exchange/campaigns/'.$campaign->id;

        $this->postJson($base.'/cancel-request', [
            'reason' => 'Admin yêu cầu hủy chiến dịch đang có nhiệm vụ.',
            'confirm' => true,
        ])->assertStatus(409);

        $beforeTransactions = \App\Models\WalletTransaction::count();
        $beforeEscrow = \App\Models\ExchangeEscrowEntry::count();

        $this->assertSame('active', $campaign->fresh()->status);
        $this->assertEquals(20000, $campaign->fresh()->budget_held);
        $this->assertEquals(0, $campaign->fresh()->budget_refunded);
        $this->assertEquals(0, $wallet->fresh()->balance);

        $this->assertSame(
            $beforeTransactions,
            \App\Models\WalletTransaction::count()
        );

        $this->assertSame(
            $beforeEscrow,
            \App\Models\ExchangeEscrowEntry::count()
        );
    }

}
