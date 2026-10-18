<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeTaskClaimApiTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(): array
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        Wallet::create([
            'user_id' => $owner->id,
            'balance' => 10000,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $campaign = ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/target/',
            'quantity' => 5,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 10000,
            'budget_held' => 0,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => 'draft',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);

        app(ExchangeEscrowService::class)
            ->holdCampaignBudget($campaign);

        $account = $this->account($worker, 'http_claim_worker');

        return [$owner, $worker, $account, $campaign];
    }

    private function account(User $user, string $username): ExchangeSocialAccount
    {
        return ExchangeSocialAccount::create([
            'user_id' => $user->id,
            'platform' => 'instagram',
            'username' => $username,
            'normalized_username' => $username,
            'profile_url' => 'https://www.instagram.com/'.$username.'/',
            'is_default' => true,
            'is_active' => true,
        ]);
    }

    private function endpoint(ExchangeCampaign $campaign): string
    {
        return '/api/exchange/tasks/'.$campaign->id.'/claim';
    }

    public function test_guest_cannot_claim(): void
    {
        [, , $account, $campaign] = $this->fixture();

        $this->postJson($this->endpoint($campaign), [
            'social_account_id' => $account->id,
        ])->assertUnauthorized();

        $this->assertSame(0, ExchangeTaskClaim::count());
    }

    public function test_worker_can_claim_without_receiving_coins(): void
    {
        [, $worker, $account, $campaign] = $this->fixture();

        Sanctum::actingAs($worker);

        $this->postJson($this->endpoint($campaign), [
            'social_account_id' => $account->id,
        ])
            ->assertCreated()
            ->assertJsonPath('status', 'claimed')
            ->assertJsonPath('campaign_id', $campaign->id)
            ->assertJsonPath('social_account_id', $account->id)
            ->assertJsonMissingPath('worker_user_id')
            ->assertJsonMissingPath('budget_held');

        $this->assertSame(1, ExchangeTaskClaim::count());
        $this->assertSame(
            0,
            Wallet::where('user_id', $worker->id)->count()
        );
        $this->assertEquals(10000, $campaign->fresh()->budget_held);
    }

    public function test_worker_cannot_claim_twice(): void
    {
        [, $worker, $account, $campaign] = $this->fixture();

        Sanctum::actingAs($worker);

        $payload = ['social_account_id' => $account->id];

        $this->postJson($this->endpoint($campaign), $payload)
            ->assertCreated();

        $this->postJson($this->endpoint($campaign), $payload)
            ->assertUnprocessable();

        $this->assertSame(1, ExchangeTaskClaim::count());
    }

    public function test_owner_cannot_claim_own_campaign(): void
    {
        [$owner, , , $campaign] = $this->fixture();

        $account = $this->account($owner, 'http_claim_owner');

        Sanctum::actingAs($owner);

        $this->postJson($this->endpoint($campaign), [
            'social_account_id' => $account->id,
        ])->assertUnprocessable();

        $this->assertSame(0, ExchangeTaskClaim::count());
    }

    public function test_worker_cannot_use_another_users_account(): void
    {
        [, , $account, $campaign] = $this->fixture();

        $other = User::factory()->create();

        Sanctum::actingAs($other);

        $this->postJson($this->endpoint($campaign), [
            'social_account_id' => $account->id,
        ])->assertUnprocessable();

        $this->assertSame(0, ExchangeTaskClaim::count());
    }

    public function test_social_account_id_is_required(): void
    {
        [, $worker, , $campaign] = $this->fixture();

        Sanctum::actingAs($worker);

        $this->postJson($this->endpoint($campaign), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['social_account_id']);

        $this->assertSame(0, ExchangeTaskClaim::count());
    }
}
