<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\ExchangeEscrowEntry;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeClaimService;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ExchangeClaimApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function prepareSubmittedClaim(): array
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

        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => 'approval_worker',
            'normalized_username' => 'approval_worker',
            'profile_url' => 'https://www.instagram.com/approval_worker/',
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

        app(ExchangeEscrowService::class)
            ->holdCampaignBudget($campaign);

        $service = app(ExchangeClaimService::class);

        $claim = $service->claim(
            $campaign->id,
            $worker,
            $account->id
        );

        $service->submit($claim->id, $worker);

        return [$owner, $worker, $claim->fresh(), $service];
    }

    public function test_owner_can_approve_and_pay_worker(): void
    {
        [$owner, $worker, $claim, $service]
            = $this->prepareSubmittedClaim();

        $service->approve($claim->id, $owner);

        $this->assertSame(
            'settled',
            $claim->fresh()->status
        );

        $this->assertEquals(
            1000,
            Wallet::where('user_id', $worker->id)
                ->value('balance')
        );

        $this->assertEquals(
            8000,
            $claim->campaign->fresh()->budget_held
        );

        $this->assertEquals(
            2000,
            $claim->campaign->fresh()->budget_settled
        );

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where(
                'claim_id',
                $claim->id
            )->where('entry_type', 'reward')->count()
        );

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where(
                'claim_id',
                $claim->id
            )->where('entry_type', 'fee')->count()
        );
    }

    public function test_other_user_cannot_approve(): void
    {
        [, , $claim, $service]
            = $this->prepareSubmittedClaim();

        $other = User::factory()->create();

        $this->expectException(RuntimeException::class);

        $service->approve($claim->id, $other);
    }

    public function test_owner_cannot_approve_after_deadline(): void
    {
        [$owner, , $claim, $service]
            = $this->prepareSubmittedClaim();

        $claim->update([
            'review_deadline_at' => now()->subSecond(),
        ]);

        $this->expectException(RuntimeException::class);

        $service->approve($claim->id, $owner);
    }

    public function test_risk_held_claim_cannot_be_approved(): void
    {
        [$owner, , $claim, $service]
            = $this->prepareSubmittedClaim();

        $claim->update(['risk_hold' => true]);

        $this->expectException(RuntimeException::class);

        $service->approve($claim->id, $owner);
    }

    public function test_claim_cannot_be_paid_twice(): void
    {
        [$owner, $worker, $claim, $service]
            = $this->prepareSubmittedClaim();

        $service->approve($claim->id, $owner);

        $this->expectException(RuntimeException::class);

        try {
            $service->approve($claim->id, $owner);
        } finally {
            $this->assertEquals(
                1000,
                Wallet::where('user_id', $worker->id)
                    ->value('balance')
            );
        }
    }
}
