<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminExchangeCampaignListTest extends TestCase
{
    use RefreshDatabase;

    private function campaign(
        User $owner,
        int $number,
        string $platform = 'instagram',
        string $status = 'active'
    ): ExchangeCampaign {
        return ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => $platform,
            'task_type' => 'follow',
            'target_url' => 'https://example.com/task/'.$number,
            'quantity' => 1,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 2000,
            'budget_held' => 2000,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => $status,
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
            'idempotency_key' => 'test_campaign_'.$number.'_key',
            'request_hash' => str_repeat('a', 64),
        ]);
    }

    public function test_guest_is_unauthorized(): void
    {
        $this->getJson('/api/admin/exchange/campaigns')
            ->assertUnauthorized();
    }

    public function test_customer_is_forbidden(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/exchange/campaigns')
            ->assertForbidden();
    }

    public function test_moderator_is_forbidden(): void
    {
        $moderator = User::factory()->create([
            'role' => 'moderator',
        ]);

        $this->actingAs($moderator, 'sanctum')
            ->getJson('/api/admin/exchange/campaigns')
            ->assertForbidden();
    }

    public function test_admin_sees_campaigns_from_multiple_owners(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $ownerA = User::factory()->create();
        $ownerB = User::factory()->create();

        $this->campaign($ownerA, 1);
        $this->campaign($ownerB, 2);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/exchange/campaigns')
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonCount(2, 'data');
    }

    public function test_platform_and_status_filters(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();

        $this->campaign($owner, 1, 'instagram', 'active');
        $this->campaign($owner, 2, 'tiktok', 'active');
        $this->campaign($owner, 3, 'instagram', 'completed');

        $this->actingAs($admin, 'sanctum')
            ->getJson(
                '/api/admin/exchange/campaigns?platform=instagram&status=active'
            )
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.platform', 'instagram')
            ->assertJsonPath('data.0.status', 'active');
    }

    public function test_pagination_and_limit(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();

        for ($i = 1; $i <= 17; $i++) {
            $this->campaign($owner, $i);
        }

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/exchange/campaigns?per_page=10')
            ->assertOk()
            ->assertJsonPath('total', 17)
            ->assertJsonPath('per_page', 10)
            ->assertJsonCount(10, 'data');

        $this->getJson(
            '/api/admin/exchange/campaigns?per_page=51'
        )->assertUnprocessable();
    }

    public function test_private_internal_fields_are_hidden(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();

        $this->campaign($owner, 1);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/exchange/campaigns')
            ->assertOk();

        $data = $response->json('data.0');

        foreach ([
            'request_hash',
            'idempotency_key',
            'social_account_id',
            'escrow_entries',
            'wallet_transactions',
            'rules_accepted',
        ] as $field) {
            $this->assertArrayNotHasKey($field, $data);
        }
    }
}
