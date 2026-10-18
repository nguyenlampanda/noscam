<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExchangeEscrowSettlementTest extends TestCase
{
    use RefreshDatabase;

    private function prepareClaim(): array
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        foreach ([$owner, $worker] as $user) {
            Wallet::create([
                'user_id' => $user->id,
                'balance' => $user->id === $owner->id ? 10000 : 0,
                'total_deposited' => 0,
                'total_spent' => 0,
                'total_refunded' => 0,
                'currency' => 'VND',
            ]);
        }

        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => 'worker_example',
            'normalized_username' => 'worker_example',
            'profile_url' => 'https://www.instagram.com/worker_example/',
            'is_default' => true,
            'is_active' => true,
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

        $service = app(ExchangeEscrowService::class);
        $service->holdCampaignBudget($campaign);

        $claim = ExchangeTaskClaim::create([
            'campaign_id' => $campaign->id,
            'worker_user_id' => $worker->id,
            'social_account_id' => $account->id,
            'submitted_username' => $account->username,
            'submitted_profile_url' => $account->profile_url,
            'status' => 'submitted',
            'claimed_at' => now()->subHour(),
            'submitted_at' => now(),
            'review_deadline_at' => now()->addHours(48),
            'risk_hold' => false,
        ]);

        return [$owner, $worker, $campaign, $claim, $service];
    }

    public function test_approved_claim_pays_worker_once(): void
    {
        [$owner, $worker, $campaign, $claim, $service]
            = $this->prepareClaim();

        $service->settleClaim($claim);

        $this->assertEquals(
            1000,
            $worker->wallet()->first()->balance
        );

        $this->assertEquals(
            8000,
            $campaign->fresh()->budget_held
        );

        $this->assertEquals(
            2000,
            $campaign->fresh()->budget_settled
        );

        $this->assertSame(
            'settled',
            $claim->fresh()->status
        );

        $this->assertEquals(
            0,
            $owner->wallet()->first()->balance
        );

        $this->assertSame(
            1,
            WalletTransaction::where('user_id', $worker->id)
                ->where('direction', 'credit')
                ->count()
        );
    }

    public function test_repeated_settlement_does_not_pay_twice(): void
    {
        [, $worker, $campaign, $claim, $service]
            = $this->prepareClaim();

        $service->settleClaim($claim);
        $service->settleClaim($claim);

        $this->assertEquals(
            1000,
            $worker->wallet()->first()->balance
        );

        $this->assertEquals(
            2000,
            $campaign->fresh()->budget_settled
        );

        $this->assertSame(
            1,
            WalletTransaction::where('user_id', $worker->id)
                ->where('direction', 'credit')
                ->count()
        );
    }

    public function test_risk_held_claim_cannot_be_settled(): void
    {
        [, $worker, $campaign, $claim, $service]
            = $this->prepareClaim();

        $claim->update(['risk_hold' => true]);

        try {
            $service->settleClaim($claim);
            $this->fail('Nhiệm vụ bị giữ rủi ro phải bị từ chối.');
        } catch (\RuntimeException $exception) {
            $this->assertEquals(
                0,
                $worker->wallet()->first()->balance
            );

            $this->assertEquals(
                10000,
                $campaign->fresh()->budget_held
            );
        }
    }
}
