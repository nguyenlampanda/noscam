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

class ExchangeTaskSubmitApiTest extends TestCase
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

    public function test_guest_cannot_submit(): void
    {
        [, , , , $claim] = $this->createClaim();

        auth()->forgetGuards();

        $this->postJson($this->submitUrl($claim))
            ->assertUnauthorized();

        $this->assertSame('claimed', $claim->fresh()->status);
    }

    public function test_worker_can_submit_with_48_hour_deadline(): void
    {
        [, $worker, $account, , $claim] = $this->createClaim();

        Sanctum::actingAs($worker);

        $before = now();

        $this->postJson($this->submitUrl($claim))
            ->assertOk()
            ->assertJsonPath('status', 'submitted')
            ->assertJsonPath('id', $claim->id)
            ->assertJsonMissingPath('worker_user_id')
            ->assertJsonMissingPath('budget_held');

        $claim->refresh();

        $this->assertNotNull($claim->submitted_at);
        $this->assertNotNull($claim->review_deadline_at);

        $this->assertEquals(
            48 * 60 * 60,
            $claim->submitted_at->diffInSeconds(
                $claim->review_deadline_at
            )
        );

        $this->assertTrue(
            $claim->submitted_at->greaterThanOrEqualTo(
                $before->copy()->subSecond()
            )
        );

        $this->assertSame(
            $account->username,
            $claim->submitted_username
        );

        $this->assertEquals(
            0,
            Wallet::where('user_id', $worker->id)->count()
        );
    }

    public function test_other_user_cannot_submit(): void
    {
        [, , , , $claim] = $this->createClaim();

        Sanctum::actingAs(User::factory()->create());

        $this->postJson($this->submitUrl($claim))
            ->assertUnprocessable();

        $this->assertSame('claimed', $claim->fresh()->status);
    }

    public function test_worker_cannot_submit_twice(): void
    {
        [, $worker, , , $claim] = $this->createClaim();

        Sanctum::actingAs($worker);

        $this->postJson($this->submitUrl($claim))
            ->assertOk();

        $deadline = $claim->fresh()->review_deadline_at;

        $this->postJson($this->submitUrl($claim))
            ->assertUnprocessable();

        $this->assertEquals(
            $deadline,
            $claim->fresh()->review_deadline_at
        );
    }

    public function test_inactive_account_cannot_submit(): void
    {
        [, $worker, $account, , $claim] = $this->createClaim();

        $account->update(['is_active' => false]);

        Sanctum::actingAs($worker);

        $this->postJson($this->submitUrl($claim))
            ->assertUnprocessable();

        $this->assertSame('claimed', $claim->fresh()->status);
    }

    public function test_submission_snapshots_social_identity(): void
    {
        [, $worker, $account, , $claim] = $this->createClaim();

        $originalUsername = $account->username;
        $originalUrl = $account->profile_url;

        Sanctum::actingAs($worker);

        $this->postJson($this->submitUrl($claim))
            ->assertOk();

        $claim->refresh();

        $this->assertSame(
            $originalUsername,
            $claim->submitted_username
        );

        $this->assertSame(
            $originalUrl,
            $claim->submitted_profile_url
        );
    }
}
