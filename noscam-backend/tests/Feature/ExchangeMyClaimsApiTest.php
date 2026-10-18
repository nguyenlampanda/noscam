<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeMyClaimsApiTest extends TestCase
{
    use RefreshDatabase;

    private function createClaim(
        User $worker,
        User $owner,
        string $username
    ): ExchangeTaskClaim {
        $campaign = ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/example/',
            'quantity' => 2,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 4000,
            'budget_held' => 4000,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => 'active',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);

        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => $username,
            'normalized_username' => strtolower($username),
            'profile_url' => 'https://www.instagram.com/'.$username.'/',
            'is_default' => true,
            'is_active' => true,
        ]);

        return ExchangeTaskClaim::create([
            'campaign_id' => $campaign->id,
            'worker_user_id' => $worker->id,
            'social_account_id' => $account->id,
            'status' => 'claimed',
            'claimed_at' => now(),
            'risk_hold' => false,
        ]);
    }

    public function test_guest_cannot_view_my_claims(): void
    {
        $this->getJson('/api/exchange/claims/mine')
            ->assertUnauthorized();
    }

    public function test_worker_sees_only_own_claims(): void
    {
        $owner = User::factory()->create();
        $workerA = User::factory()->create();
        $workerB = User::factory()->create();

        $claimA = $this->createClaim(
            $workerA,
            $owner,
            'worker_alpha'
        );

        $claimB = $this->createClaim(
            $workerB,
            $owner,
            'worker_beta'
        );

        Sanctum::actingAs($workerA);

        $response = $this->getJson('/api/exchange/claims/mine')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $claimA->id)
            ->assertJsonPath('data.0.social_username', 'worker_alpha')
            ->assertJsonPath('data.0.reward_per_task', 1000);

        $ids = collect($response->json('data'))
            ->pluck('id')
            ->all();

        $this->assertNotContains($claimB->id, $ids);

        $response->assertDontSee('worker_beta');
        $response->assertDontSee('worker_user_id');
        $response->assertDontSee('budget_held');
    }

    public function test_owner_cannot_view_workers_claims_as_own(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $this->createClaim(
            $worker,
            $owner,
            'worker_gamma'
        );

        Sanctum::actingAs($owner);

        $this->getJson('/api/exchange/claims/mine')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_my_claims_are_paginated(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        for ($i = 1; $i <= 17; $i++) {
            $this->createClaim(
                $worker,
                $owner,
                'worker_page_'.$i
            );
        }

        Sanctum::actingAs($worker);

        $this->getJson('/api/exchange/claims/mine')
            ->assertOk()
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('total', 17)
            ->assertJsonPath('per_page', 15);

        $this->getJson('/api/exchange/claims/mine?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
