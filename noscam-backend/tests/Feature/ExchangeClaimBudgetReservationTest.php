<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeClaimService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ExchangeClaimBudgetReservationTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_claims_reserve_remaining_budget(): void
    {
        $owner = User::factory()->create();

        Wallet::create([
            'user_id' => $owner->id,
            'balance' => 0,
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
            'budget_held' => 4000,
            'budget_settled' => 6000,
            'budget_refunded' => 0,
            'status' => 'active',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);

        for ($i = 1; $i <= 2; $i++) {
            $worker = User::factory()->create();

            $account = ExchangeSocialAccount::create([
                'user_id' => $worker->id,
                'platform' => 'instagram',
                'username' => 'pending_worker_'.$i,
                'normalized_username' => 'pending_worker_'.$i,
                'profile_url' => 'https://www.instagram.com/pending_worker_'.$i.'/',
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

        $thirdWorker = User::factory()->create();

        $thirdAccount = ExchangeSocialAccount::create([
            'user_id' => $thirdWorker->id,
            'platform' => 'instagram',
            'username' => 'third_worker',
            'normalized_username' => 'third_worker',
            'profile_url' => 'https://www.instagram.com/third_worker/',
            'is_default' => true,
            'is_active' => true,
        ]);

        $beforeClaims = ExchangeTaskClaim::count();
        $beforeWallet = Wallet::findOrFail(
            Wallet::where('user_id', $owner->id)->value('id')
        )->balance;

        try {
            app(ExchangeClaimService::class)->claim(
                $campaign->id,
                $thirdWorker,
                $thirdAccount->id
            );

            $this->fail(
                'Không được nhận nhiệm vụ khi ngân sách đã cam kết hết.'
            );
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Ngân sách còn lại đã được cam kết cho nhiệm vụ khác.',
                $exception->getMessage()
            );
        }

        $this->assertSame(
            $beforeClaims,
            ExchangeTaskClaim::count()
        );

        $this->assertEquals(
            4000,
            $campaign->fresh()->budget_held
        );

        $this->assertEquals(
            $beforeWallet,
            Wallet::where('user_id', $owner->id)->value('balance')
        );
    }
}
