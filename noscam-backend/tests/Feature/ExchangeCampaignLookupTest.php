<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeCampaignLookupTest extends TestCase
{
    use RefreshDatabase;

    private function campaign(User $owner, string $key): ExchangeCampaign
    {
        return ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/example/',
            'quantity' => 3,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 6000,
            'budget_held' => 6000,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => 'active',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
            'idempotency_key' => $key,
            'request_hash' => str_repeat('a', 64),
        ]);
    }

    public function test_guest_cannot_lookup_campaign(): void
    {
        $this->getJson(
            '/api/exchange/campaigns/by-request/exchange-lookup-test-key'
        )->assertUnauthorized();
    }

    public function test_owner_can_lookup_own_campaign(): void
    {
        $owner = User::factory()->create();
        $campaign = $this->campaign(
            $owner,
            'exchange-lookup-test-key'
        );

        Sanctum::actingAs($owner);

        $this->getJson(
            '/api/exchange/campaigns/by-request/exchange-lookup-test-key'
        )
            ->assertOk()
            ->assertJsonPath('status', 'created')
            ->assertJsonPath('data.id', $campaign->id)
            ->assertJsonPath('data.budget_total', 6000)
            ->assertJsonMissingPath('data.idempotency_key')
            ->assertJsonMissingPath('data.request_hash');
    }

    public function test_other_user_cannot_lookup_campaign(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->campaign($owner, 'exchange-lookup-test-key');

        Sanctum::actingAs($other);

        $this->getJson(
            '/api/exchange/campaigns/by-request/exchange-lookup-test-key'
        )
            ->assertNotFound()
            ->assertJsonPath('status', 'not_found');
    }

    public function test_unknown_key_returns_not_found(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson(
            '/api/exchange/campaigns/by-request/exchange-unknown-test-key'
        )
            ->assertNotFound()
            ->assertJsonPath('status', 'not_found');
    }
}
