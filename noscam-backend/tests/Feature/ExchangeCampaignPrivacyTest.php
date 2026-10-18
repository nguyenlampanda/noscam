<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeCampaignPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private function campaign(User $owner, int $number): ExchangeCampaign
    {
        return ExchangeCampaign::create([
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
    }

    public function test_guest_cannot_view_campaigns(): void
    {
        $this->getJson('/api/exchange/campaigns')
            ->assertUnauthorized();

        $this->getJson('/api/exchange/campaigns/1')
            ->assertUnauthorized();
    }

    public function test_customer_only_sees_own_campaigns(): void
    {
        $ownerA = User::factory()->create();
        $ownerB = User::factory()->create();

        $own = $this->campaign($ownerA, 1);
        $other = $this->campaign($ownerB, 2);

        Sanctum::actingAs($ownerA);

        $response = $this->getJson('/api/exchange/campaigns')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'data');

        $this->assertSame(
            $own->id,
            $response->json('data.0.id')
        );

        $this->assertNotSame(
            $other->id,
            $response->json('data.0.id')
        );
    }

    public function test_customer_cannot_open_another_users_campaign(): void
    {
        $ownerA = User::factory()->create();
        $ownerB = User::factory()->create();

        $campaign = $this->campaign($ownerA, 1);

        Sanctum::actingAs($ownerB);

        $this->getJson(
            '/api/exchange/campaigns/'.$campaign->id
        )->assertNotFound();
    }

    public function test_owner_can_open_own_campaign_without_private_fields(): void
    {
        $owner = User::factory()->create();
        $campaign = $this->campaign($owner, 1);

        Sanctum::actingAs($owner);

        $response = $this->getJson(
            '/api/exchange/campaigns/'.$campaign->id
        )
            ->assertOk()
            ->assertJsonPath('data.id', $campaign->id)
            ->assertJsonPath('data.status', 'active');

        $data = $response->json('data');

        foreach ([
            'user_id',
            'worker_user_id',
            'social_account_id',
            'claims',
            'disputes',
            'escrow_entries',
            'wallet_transactions',
        ] as $field) {
            $this->assertArrayNotHasKey($field, $data);
        }
    }

    public function test_campaign_list_is_paginated(): void
    {
        $owner = User::factory()->create();

        for ($i = 1; $i <= 17; $i++) {
            $this->campaign($owner, $i);
        }

        Sanctum::actingAs($owner);

        $this->getJson('/api/exchange/campaigns')
            ->assertOk()
            ->assertJsonPath('total', 17)
            ->assertJsonPath('per_page', 15)
            ->assertJsonCount(15, 'data');

        $this->getJson('/api/exchange/campaigns?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
