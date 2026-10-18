<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeTaskListingTest extends TestCase
{
    use RefreshDatabase;

    private function campaign(
        User $owner,
        string $status = 'active',
        int $quantity = 2
    ): ExchangeCampaign {
        return ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/example/',
            'quantity' => $quantity,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => $quantity * 2000,
            'budget_held' => $quantity * 2000,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => $status,
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);
    }

    private function claim(
        ExchangeCampaign $campaign,
        User $worker,
        int $number
    ): void {
        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => 'worker'.$number,
            'normalized_username' => 'worker'.$number,
            'profile_url' => 'https://www.instagram.com/worker'.$number.'/',
            'is_default' => true,
            'is_active' => true,
        ]);

        ExchangeTaskClaim::create([
            'campaign_id' => $campaign->id,
            'worker_user_id' => $worker->id,
            'social_account_id' => $account->id,
            'status' => 'claimed',
            'claimed_at' => now(),
        ]);
    }

    public function test_guest_cannot_view_tasks(): void
    {
        $this->getJson('/api/exchange/tasks')
            ->assertUnauthorized();
    }

    public function test_only_eligible_campaign_is_visible(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();

        $eligible = $this->campaign($owner);
        $this->campaign($viewer);
        $this->campaign($owner, 'closed');

        $full = $this->campaign($owner, 'active', 1);
        $this->claim($full, User::factory()->create(), 1);

        $alreadyClaimed = $this->campaign($owner);
        $this->claim($alreadyClaimed, $viewer, 2);

        Sanctum::actingAs($viewer);

        $response = $this->getJson('/api/exchange/tasks')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertSame(
            $eligible->id,
            $response->json('data.0.id')
        );
    }

    public function test_task_response_does_not_leak_private_data(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();

        $campaign = $this->campaign($owner);

        Sanctum::actingAs($viewer);

        $response = $this->getJson('/api/exchange/tasks')
            ->assertOk()
            ->assertJsonPath('data.0.id', $campaign->id)
            ->assertJsonPath('data.0.reward_per_task', 1000);

        $this->assertSame(
            [
                'id',
                'platform',
                'task_type',
                'target_url',
                'reward_per_task',
                'currency',
            ],
            array_keys($response->json('data.0'))
        );
    }

    public function test_task_list_is_paginated(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();

        for ($i = 0; $i < 17; $i++) {
            $this->campaign($owner);
        }

        Sanctum::actingAs($viewer);

        $this->getJson('/api/exchange/tasks')
            ->assertOk()
            ->assertJsonPath('total', 17)
            ->assertJsonPath('per_page', 15)
            ->assertJsonCount(15, 'data');

        $this->getJson('/api/exchange/tasks?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
