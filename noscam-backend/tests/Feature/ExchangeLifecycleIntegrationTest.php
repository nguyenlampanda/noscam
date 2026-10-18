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

class ExchangeLifecycleIntegrationTest extends TestCase
{
    use RefreshDatabase;

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

    private function claimAndSubmit(
        User $worker,
        ExchangeSocialAccount $account,
        ExchangeCampaign $campaign
    ): ExchangeTaskClaim {
        Sanctum::actingAs($worker);

        $response = $this->postJson(
            '/api/exchange/tasks/'.$campaign->id.'/claim',
            ['social_account_id' => $account->id]
        )->assertCreated();

        $claim = ExchangeTaskClaim::findOrFail($response->json('id'));

        $this->postJson(
            '/api/exchange/claims/'.$claim->id.'/submit'
        )->assertOk()->assertJsonPath('status', 'submitted');

        return $claim->fresh();
    }

    public function test_complete_lifecycle_preserves_all_balances(): void
    {
        $owner = User::factory()->create();
        $workerA = User::factory()->create();
        $workerB = User::factory()->create();

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

        $escrow = app(ExchangeEscrowService::class);

        $escrow->holdCampaignBudget($campaign);
        $escrow->holdCampaignBudget($campaign);

        $this->assertEquals(0, $owner->wallet()->first()->balance);
        $this->assertEquals(10000, $campaign->fresh()->budget_held);

        $claimA = $this->claimAndSubmit(
            $workerA,
            $this->account($workerA, 'lifecycle_worker_a'),
            $campaign
        );

        $claimB = $this->claimAndSubmit(
            $workerB,
            $this->account($workerB, 'lifecycle_worker_b'),
            $campaign
        );

        $this->assertEquals(0, $workerA->wallet()->count());
        $this->assertEquals(0, $workerB->wallet()->count());

        Sanctum::actingAs($owner);

        $approveUrl = '/api/exchange/claims/'.$claimA->id.'/approve';

        $this->postJson($approveUrl)
            ->assertOk()
            ->assertJsonPath('status', 'settled');

        $this->postJson($approveUrl)->assertUnprocessable();

        $this->assertEquals(1000, $workerA->wallet()->first()->balance);

        $this->assertEquals(
            1,
            ExchangeEscrowEntry::where('claim_id', $claimA->id)
                ->where('entry_type', 'reward')->count()
        );

        $this->assertEquals(
            1,
            ExchangeEscrowEntry::where('claim_id', $claimA->id)
                ->where('entry_type', 'fee')->count()
        );

        $rejectUrl = '/api/exchange/claims/'.$claimB->id.'/reject';

        $this->postJson($rejectUrl, [
            'reason' => 'Không xác minh được lượt theo dõi.',
        ])->assertOk()->assertJsonPath('status', 'rejected');

        $this->assertEquals(0, $owner->wallet()->first()->balance);
        $this->assertEquals(0, $workerB->wallet()->count());

        // Mô phỏng từ chối cách đây 49 giờ.
        // Hạn khiếu nại vẫn đủ 48 giờ theo quy định.
        $rejectedAt = now()->subHours(49);

        $claimB->update([
            'rejected_at' => $rejectedAt,
            'appeal_deadline_at' => $rejectedAt->copy()->addHours(48),
        ]);

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->assertSame('refunded', $claimB->fresh()->status);

        $this->assertEquals(2000, $owner->wallet()->first()->balance);
        $this->assertEquals(1000, $workerA->wallet()->first()->balance);
        $this->assertEquals(0, $workerB->wallet()->count());

        $campaign->refresh();

        $this->assertEquals(6000, $campaign->budget_held);
        $this->assertEquals(2000, $campaign->budget_settled);
        $this->assertEquals(2000, $campaign->budget_refunded);

        $this->assertEquals(
            $campaign->budget_total,
            $campaign->budget_held
                + $campaign->budget_settled
                + $campaign->budget_refunded
        );

        $this->assertEquals(
            1,
            ExchangeEscrowEntry::where('claim_id', $claimB->id)
                ->where('entry_type', 'refund')->count()
        );
    }
}
