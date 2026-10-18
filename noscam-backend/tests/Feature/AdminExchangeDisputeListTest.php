<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\ExchangeTaskDispute;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminExchangeDisputeListTest extends TestCase
{
    use RefreshDatabase;

    private function dispute(
        User $owner,
        User $worker,
        int $number,
        string $status = 'pending'
    ): ExchangeTaskDispute {
        $username = 'dispute_list_worker_'.$number;

        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => $username,
            'normalized_username' => $username,
            'profile_url' => 'https://www.instagram.com/'.$username.'/',
            'is_default' => true,
            'is_active' => true,
        ]);

        $campaign = ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/test'.$number.'/',
            'quantity' => 1,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 2000,
            'budget_held' => 2000,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => 'active',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);

        $claim = ExchangeTaskClaim::create([
            'campaign_id' => $campaign->id,
            'worker_user_id' => $worker->id,
            'social_account_id' => $account->id,
            'submitted_username' => $username,
            'submitted_profile_url' => $account->profile_url,
            'status' => 'disputed',
            'claimed_at' => now()->subDays(3),
            'submitted_at' => now()->subDays(2),
            'rejected_at' => now()->subDay(),
            'risk_hold' => false,
        ]);

        return ExchangeTaskDispute::create([
            'claim_id' => $claim->id,
            'opened_by' => $worker->id,
            'status' => $status,
            'appeal_reason' => 'Yêu cầu xem xét '.$number,
            'evidence' => ['private' => 'secret-'.$number],
            'admin_reason' => $status === 'pending'
                ? null : 'Đã phân xử',
            'resolved_by' => $status === 'pending'
                ? null : $owner->id,
            'resolved_at' => $status === 'pending'
                ? null : now(),
        ]);
    }

    public function test_guest_cannot_view_disputes(): void
    {
        $this->getJson('/api/admin/exchange/disputes')
            ->assertUnauthorized();
    }

    public function test_customer_cannot_view_disputes(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/exchange/disputes')
            ->assertForbidden();
    }

    public function test_moderator_cannot_view_disputes(): void
    {
        $user = User::factory()->create(['role' => 'moderator']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/exchange/disputes')
            ->assertForbidden();
    }

    public function test_admin_sees_pending_by_default(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $pending = $this->dispute($owner, $worker, 1);
        $this->dispute($owner, $worker, 2, 'approved');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/exchange/disputes')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'data');

        $this->assertSame(
            $pending->id,
            $response->json('data.0.id')
        );
    }

    public function test_admin_can_filter_resolved_disputes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $this->dispute($owner, $worker, 1);
        $this->dispute($owner, $worker, 2, 'rejected');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/exchange/disputes?status=rejected')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.status', 'rejected');
    }

    public function test_pagination_limit_is_validated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/exchange/disputes?per_page=51')
            ->assertUnprocessable();
    }

    public function test_private_evidence_is_not_in_list(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $this->dispute($owner, $worker, 1);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/exchange/disputes')
            ->assertOk();

        $data = $response->json('data.0');

        $this->assertArrayNotHasKey('evidence', $data);
        $this->assertArrayNotHasKey('wallet_transactions', $data);
        $this->assertArrayHasKey('claim', $data);
        $this->assertArrayNotHasKey(
            'social_account_id',
            $data['claim']
        );
    }
}
