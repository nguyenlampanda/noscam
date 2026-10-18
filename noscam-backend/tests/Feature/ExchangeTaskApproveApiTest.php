<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeTaskApproveApiTest extends TestCase
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


    private function createClaim(): array
    {
        [$owner, $worker, $account, $campaign] = $this->fixture();

        Sanctum::actingAs($worker);

        $response = $this->postJson(
            $this->endpoint($campaign),
            ['social_account_id' => $account->id]
        );

        $response->assertCreated();

        $claim = ExchangeTaskClaim::findOrFail(
            $response->json('id')
        );

        return [$owner, $worker, $account, $campaign, $claim];
    }

    private function submitUrl(ExchangeTaskClaim $claim): string
    {
        return '/api/exchange/claims/'.$claim->id.'/submit';
    }


    private function submittedFixture(): array
    {
        [$owner, $worker, $account, $campaign, $claim] =
            $this->createClaim();

        Sanctum::actingAs($worker);

        $this->postJson(
            '/api/exchange/claims/'.$claim->id.'/submit'
        )->assertOk();

        return [$owner, $worker, $account, $campaign, $claim->fresh()];
    }

    private function approveUrl(ExchangeTaskClaim $claim): string
    {
        return '/api/exchange/claims/'.$claim->id.'/approve';
    }

    public function test_guest_cannot_approve(): void
    {
        [, , , , $claim] = $this->submittedFixture();

        auth()->forgetGuards();

        $this->postJson($this->approveUrl($claim))
            ->assertUnauthorized();

        $this->assertSame('submitted', $claim->fresh()->status);
    }

    public function test_owner_approves_and_worker_receives_coins(): void
    {
        [$owner, $worker, , $campaign, $claim] =
            $this->submittedFixture();

        Sanctum::actingAs($owner);

        $this->postJson($this->approveUrl($claim))
            ->assertOk()
            ->assertJsonPath('status', 'settled')
            ->assertJsonPath('id', $claim->id)
            ->assertJsonMissingPath('worker_user_id')
            ->assertJsonMissingPath('budget_held');

        $this->assertEquals(
            1000,
            Wallet::where('user_id', $worker->id)->value('balance')
        );

        $campaign->refresh();

        $this->assertEquals(8000, $campaign->budget_held);
        $this->assertEquals(2000, $campaign->budget_settled);
        $this->assertEquals(0, $campaign->budget_refunded);

        $this->assertSame('settled', $claim->fresh()->status);

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('claim_id', $claim->id)
                ->where('entry_type', 'reward')->count()
        );

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('claim_id', $claim->id)
                ->where('entry_type', 'fee')->count()
        );
    }

    public function test_worker_cannot_approve_own_claim(): void
    {
        [, $worker, , , $claim] = $this->submittedFixture();

        Sanctum::actingAs($worker);

        $this->postJson($this->approveUrl($claim))
            ->assertUnprocessable();

        $this->assertSame('submitted', $claim->fresh()->status);
    }

    public function test_unrelated_user_cannot_approve(): void
    {
        [, , , , $claim] = $this->submittedFixture();

        Sanctum::actingAs(User::factory()->create());

        $this->postJson($this->approveUrl($claim))
            ->assertUnprocessable();

        $this->assertSame('submitted', $claim->fresh()->status);
    }

    public function test_owner_cannot_approve_twice(): void
    {
        [$owner, $worker, , , $claim] =
            $this->submittedFixture();

        Sanctum::actingAs($owner);

        $this->postJson($this->approveUrl($claim))
            ->assertOk();

        $this->postJson($this->approveUrl($claim))
            ->assertUnprocessable();

        $this->assertEquals(
            1000,
            Wallet::where('user_id', $worker->id)->value('balance')
        );

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('claim_id', $claim->id)
                ->where('entry_type', 'reward')->count()
        );
    }

    public function test_owner_cannot_approve_after_deadline(): void
    {
        [$owner, $worker, , , $claim] =
            $this->submittedFixture();

        $claim->update([
            'review_deadline_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($owner);

        $this->postJson($this->approveUrl($claim))
            ->assertUnprocessable();

        $this->assertSame('submitted', $claim->fresh()->status);

        $this->assertSame(
            0,
            Wallet::where('user_id', $worker->id)->count()
        );
    }

    public function test_risk_held_claim_cannot_be_approved(): void
    {
        [$owner, , , , $claim] =
            $this->submittedFixture();

        $claim->update(['risk_hold' => true]);

        Sanctum::actingAs($owner);

        $this->postJson($this->approveUrl($claim))
            ->assertUnprocessable();

        $this->assertSame('submitted', $claim->fresh()->status);
    }
}
