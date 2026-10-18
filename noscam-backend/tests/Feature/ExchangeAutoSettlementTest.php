<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskDispute;
use App\Models\ExchangeEscrowEntry;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeClaimService;
use App\Services\Exchange\ExchangeDisputeService;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ExchangeAutoSettlementTest extends TestCase
{
    use RefreshDatabase;

    private function prepareDispute(): array
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

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
            'username' => 'dispute_worker',
            'normalized_username' => 'dispute_worker',
            'profile_url' => 'https://www.instagram.com/dispute_worker/',
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

        $claimService = app(ExchangeClaimService::class);

        $claim = $claimService->claim(
            $campaign->id,
            $worker,
            $account->id
        );

        $claimService->submit($claim->id, $worker);

        $claimService->reject(
            $claim->id,
            $owner,
            'Không tìm thấy lượt theo dõi.'
        );

        $claimService->appeal(
            $claim->id,
            $worker,
            'Tôi đã hoàn thành nhiệm vụ.'
        );

        $dispute = ExchangeTaskDispute::where(
            'claim_id',
            $claim->id
        )->firstOrFail();

        return [
            $owner,
            $worker,
            $admin,
            $claim->fresh(),
            $dispute,
        ];
    }


    private function submittedFixture(): array
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();

        $dispute->delete();

        $claim->update([
            'status' => 'submitted',
            'rejected_at' => null,
            'appeal_deadline_at' => null,
            'rejection_reason' => null,
        ]);

        return [$owner, $worker, $claim->fresh()];
    }

    private function rejectedFixture(): array
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();

        $dispute->delete();

        $claim->update([
            'status' => 'rejected',
            'rejected_at' => now()->subHours(49),
            'appeal_deadline_at' => now()->subHour(),
        ]);

        return [$owner, $worker, $claim->fresh()];
    }

    public function test_auto_approves_expired_submission(): void
    {
        [$owner, $worker, $claim] = $this->submittedFixture();

        $claim->update([
            'review_deadline_at' => now()->subMinute(),
        ]);

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->assertSame('settled', $claim->fresh()->status);
        $this->assertEquals(
            1000,
            $worker->wallet()->first()->balance
        );
    }

    public function test_auto_refunds_expired_rejection(): void
    {
        [$owner, $worker, $claim] = $this->rejectedFixture();

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->assertSame('refunded', $claim->fresh()->status);
        $this->assertEquals(
            2000,
            $owner->wallet()->first()->balance
        );
    }

    public function test_does_not_approve_before_deadline(): void
    {
        [$owner, $worker, $claim] = $this->submittedFixture();

        $claim->update([
            'review_deadline_at' => now()->addHour(),
        ]);

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->assertSame('submitted', $claim->fresh()->status);
        $this->assertSame(
            0,
            $worker->wallet()->count()
        );
    }

    public function test_skips_risk_hold(): void
    {
        [$owner, $worker, $claim] = $this->submittedFixture();

        $claim->update([
            'review_deadline_at' => now()->subMinute(),
            'risk_hold' => true,
        ]);

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->assertSame('submitted', $claim->fresh()->status);
    }

    public function test_skips_disputed_claim(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->assertSame('disputed', $claim->fresh()->status);
        $this->assertSame('pending', $dispute->fresh()->status);
    }

    public function test_does_not_pay_twice(): void
    {
        [$owner, $worker, $claim] = $this->submittedFixture();

        $claim->update([
            'review_deadline_at' => now()->subMinute(),
        ]);

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->artisan('exchange:process-expired')
            ->assertSuccessful();

        $this->assertSame('settled', $claim->fresh()->status);
        $this->assertEquals(
            1000,
            $worker->wallet()->first()->balance
        );
    }
}
