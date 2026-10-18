<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\ExchangeTaskDispute;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeTaskAppealApiTest extends TestCase
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


    private function rejectUrl(ExchangeTaskClaim $claim): string
    {
        return '/api/exchange/claims/'.$claim->id.'/reject';
    }


    private function rejectedFixture(): array
    {
        [$owner, $worker, $account, $campaign, $claim] =
            $this->submittedFixture();

        Sanctum::actingAs($owner);

        $this->postJson(
            '/api/exchange/claims/'.$claim->id.'/reject',
            ['reason' => 'Chưa xác minh được nhiệm vụ.']
        )->assertOk();

        return [$owner, $worker, $account, $campaign, $claim->fresh()];
    }

    private function appealUrl(ExchangeTaskClaim $claim): string
    {
        return '/api/exchange/claims/'.$claim->id.'/appeal';
    }

    public function test_guest_cannot_appeal(): void
    {
        [, , , , $claim] = $this->rejectedFixture();

        auth()->forgetGuards();

        $this->postJson($this->appealUrl($claim), [
            'reason' => 'Tôi đã hoàn thành nhiệm vụ.',
        ])->assertUnauthorized();

        $this->assertSame(0, ExchangeTaskDispute::count());
    }

    public function test_worker_can_appeal_without_moving_coins(): void
    {
        [$owner, $worker, , $campaign, $claim] =
            $this->rejectedFixture();

        Sanctum::actingAs($worker);

        $this->postJson($this->appealUrl($claim), [
            'reason' => 'Tôi đã hoàn thành nhiệm vụ.',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'disputed')
            ->assertJsonPath('id', $claim->id)
            ->assertJsonMissingPath('worker_user_id')
            ->assertJsonMissingPath('budget_held');

        $this->assertSame('disputed', $claim->fresh()->status);

        $dispute = ExchangeTaskDispute::where(
            'claim_id',
            $claim->id
        )->firstOrFail();

        $this->assertSame('pending', $dispute->status);
        $this->assertSame($worker->id, $dispute->opened_by);

        $campaign->refresh();

        $this->assertEquals(10000, $campaign->budget_held);
        $this->assertEquals(0, $campaign->budget_settled);
        $this->assertEquals(0, $campaign->budget_refunded);

        $this->assertEquals(
            0,
            Wallet::where('user_id', $owner->id)->value('balance')
        );

        $this->assertSame(
            0,
            Wallet::where('user_id', $worker->id)->count()
        );

        $this->assertSame(
            0,
            ExchangeEscrowEntry::where('claim_id', $claim->id)->count()
        );
    }

    public function test_appeal_requires_reason(): void
    {
        [, $worker, , , $claim] = $this->rejectedFixture();

        Sanctum::actingAs($worker);

        $this->postJson($this->appealUrl($claim), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reason']);

        $this->assertSame(0, ExchangeTaskDispute::count());
    }

    public function test_owner_cannot_appeal(): void
    {
        [$owner, , , , $claim] = $this->rejectedFixture();

        Sanctum::actingAs($owner);

        $this->postJson($this->appealUrl($claim), [
            'reason' => 'Khiếu nại không đúng quyền.',
        ])->assertUnprocessable();

        $this->assertSame(0, ExchangeTaskDispute::count());
    }

    public function test_unrelated_user_cannot_appeal(): void
    {
        [, , , , $claim] = $this->rejectedFixture();

        Sanctum::actingAs(User::factory()->create());

        $this->postJson($this->appealUrl($claim), [
            'reason' => 'Khiếu nại không đúng quyền.',
        ])->assertUnprocessable();

        $this->assertSame(0, ExchangeTaskDispute::count());
    }

    public function test_worker_cannot_appeal_twice(): void
    {
        [, $worker, , , $claim] = $this->rejectedFixture();

        Sanctum::actingAs($worker);

        $payload = [
            'reason' => 'Tôi đã hoàn thành nhiệm vụ.',
        ];

        $this->postJson($this->appealUrl($claim), $payload)
            ->assertOk();

        $this->postJson($this->appealUrl($claim), $payload)
            ->assertUnprocessable();

        $this->assertSame(1, ExchangeTaskDispute::count());
    }

    public function test_worker_cannot_appeal_after_deadline(): void
    {
        [, $worker, , , $claim] = $this->rejectedFixture();

        $claim->update([
            'appeal_deadline_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($worker);

        $this->postJson($this->appealUrl($claim), [
            'reason' => 'Tôi đã hoàn thành nhiệm vụ.',
        ])->assertUnprocessable();

        $this->assertSame('rejected', $claim->fresh()->status);
        $this->assertSame(0, ExchangeTaskDispute::count());
    }
}
