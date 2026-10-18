<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeTaskBudgetListingTest extends TestCase
{
    use RefreshDatabase;

    private function campaign(User $owner, int $held): ExchangeCampaign
    {
        return ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/target/',
            'quantity' => 5,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 10000,
            'budget_held' => $held,
            'budget_settled' => 10000 - $held,
            'budget_refunded' => 0,
            'status' => 'active',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);
    }

    private function pendingClaim(ExchangeCampaign $campaign, int $number): void
    {
        $worker = User::factory()->create();

        $username = 'budget_listing_worker_'.$number;

        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => $username,
            'normalized_username' => $username,
            'profile_url' => 'https://www.instagram.com/'.$username.'/',
            'is_default' => true,
            'is_active' => true,
        ]);

        ExchangeTaskClaim::create([
            'campaign_id' => $campaign->id,
            'worker_user_id' => $worker->id,
            'social_account_id' => $account->id,
            'status' => 'submitted',
            'claimed_at' => now(),
            'submitted_at' => now(),
            'review_deadline_at' => now()->addHours(48),
        ]);
    }

    public function test_listing_hides_fully_reserved_budget(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $available = $this->campaign($owner, 6000);
        $reserved = $this->campaign($owner, 4000);

        $this->pendingClaim($available, 1);

        $this->pendingClaim($reserved, 2);
        $this->pendingClaim($reserved, 3);

        Sanctum::actingAs($viewer);

        $this->getJson('/api/exchange/tasks')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $available->id)
            ->assertJsonMissing(['id' => $reserved->id]);
    }
}
