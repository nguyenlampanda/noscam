<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeCampaignClaimsApiTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(): array
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

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
            'username' => 'private_worker',
            'normalized_username' => 'private_worker',
            'profile_url' => 'https://www.instagram.com/private_worker/',
            'is_default' => true,
            'is_active' => true,
        ]);

        $claim = ExchangeTaskClaim::create([
            'campaign_id' => $campaign->id,
            'worker_user_id' => $worker->id,
            'social_account_id' => $account->id,
            'submitted_username' => 'private_worker',
            'submitted_profile_url' => $account->profile_url,
            'status' => 'submitted',
            'claimed_at' => now()->subHour(),
            'submitted_at' => now(),
            'review_deadline_at' => now()->addHours(48),
            'risk_hold' => false,
        ]);

        return [$owner, $worker, $campaign, $claim];
    }

    private function url(ExchangeCampaign $campaign): string
    {
        return '/api/exchange/campaigns/'.$campaign->id.'/claims';
    }

    public function test_guest_cannot_view_claims(): void
    {
        [, , $campaign] = $this->fixture();

        $this->getJson($this->url($campaign))
            ->assertUnauthorized();
    }

    public function test_owner_sees_only_safe_claim_fields(): void
    {
        [$owner, , $campaign, $claim] = $this->fixture();

        Sanctum::actingAs($owner);

        $response = $this->getJson($this->url($campaign))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $claim->id)
            ->assertJsonPath('data.0.status', 'submitted')
            ->assertJsonPath(
                'data.0.social_username',
                'private_worker'
            );

        foreach ([
            'worker_user_id',
            'social_account_id',
            'wallet',
            'budget_held',
            'idempotency_key',
        ] as $privateField) {
            $response->assertJsonMissingPath('data.0.'.$privateField);
        }
    }

    public function test_worker_cannot_view_owner_claims(): void
    {
        [, $worker, $campaign] = $this->fixture();

        Sanctum::actingAs($worker);

        $this->getJson($this->url($campaign))
            ->assertNotFound();
    }

    public function test_unrelated_user_cannot_view_claims(): void
    {
        [, , $campaign] = $this->fixture();

        Sanctum::actingAs(User::factory()->create());

        $this->getJson($this->url($campaign))
            ->assertNotFound();
    }
}
