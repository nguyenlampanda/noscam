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
use RuntimeException;
use Tests\TestCase;

class ExchangeEscrowRefundTest extends TestCase
{
    use RefreshDatabase;

    private function prepareRejectedClaim(): array
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $wallet = Wallet::create([
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
            'username' => 'refund_worker',
            'normalized_username' => 'refund_worker',
            'profile_url' => 'https://www.instagram.com/refund_worker/',
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
            'status' => 'rejected',
            'claimed_at' => now()->subDays(5),
            'submitted_at' => now()->subDays(4),
            'review_deadline_at' => now()->subDays(2),
            'rejected_at' => now()->subDays(3),
            'appeal_deadline_at' => now()->subDay(),
            'rejection_reason' => 'Không xác minh được nhiệm vụ.',
            'risk_hold' => false,
        ]);

        return [$owner, $wallet, $campaign, $claim, $service];
    }

    public function test_final_rejection_refunds_owner(): void
    {
        [$owner, $wallet, $campaign, $claim, $service]
            = $this->prepareRejectedClaim();

        $service->refundClaim($claim);

        $this->assertEquals(2000, $wallet->fresh()->balance);
        $this->assertEquals(8000, $campaign->fresh()->budget_held);
        $this->assertEquals(2000, $campaign->fresh()->budget_refunded);
        $this->assertSame('refunded', $claim->fresh()->status);

        $this->assertSame(
            1,
            WalletTransaction::where('user_id', $owner->id)
                ->where('direction', 'credit')
                ->count()
        );
    }

    public function test_repeated_refund_does_not_credit_twice(): void
    {
        [, $wallet, $campaign, $claim, $service]
            = $this->prepareRejectedClaim();

        $service->refundClaim($claim);
        $service->refundClaim($claim);

        $this->assertEquals(2000, $wallet->fresh()->balance);
        $this->assertEquals(2000, $campaign->fresh()->budget_refunded);
    }


    public function test_failed_refund_ledger_insert_rolls_back_credit(): void
    {
        [$owner, $wallet, $campaign, $claim, $service]
            = $this->prepareRejectedClaim();

        \Illuminate\Support\Facades\DB::statement("
            CREATE TRIGGER exchange_refund_test_failure
            BEFORE INSERT ON exchange_escrow_entries
            WHEN NEW.entry_type = 'refund'
            BEGIN
                SELECT RAISE(ABORT, 'Simulated refund failure');
            END
        ");

        $failed = false;

        try {
            $service->refundClaim($claim);
        } catch (\Throwable $exception) {
            $failed = true;

            $this->assertStringContainsString(
                'Simulated refund failure',
                $exception->getMessage()
            );
        }

        $this->assertTrue($failed);

        $this->assertEquals(
            0,
            $wallet->fresh()->balance
        );

        $this->assertEquals(
            10000,
            $campaign->fresh()->budget_held
        );

        $this->assertEquals(
            0,
            $campaign->fresh()->budget_refunded
        );

        $this->assertSame(
            'rejected',
            $claim->fresh()->status
        );

        $this->assertDatabaseMissing(
            'exchange_escrow_entries',
            [
                'claim_id' => $claim->id,
                'entry_type' => 'refund',
            ]
        );

        $this->assertSame(
            0,
            WalletTransaction::where('user_id', $owner->id)
                ->where('direction', 'credit')
                ->count()
        );
    }

    public function test_refund_before_appeal_deadline_is_rejected(): void
    {
        [, $wallet, $campaign, $claim, $service]
            = $this->prepareRejectedClaim();

        $claim->update([
            'appeal_deadline_at' => now()->addHours(24),
        ]);

        try {
            $service->refundClaim($claim);
            $this->fail('Không được hoàn xu trước hạn khiếu nại.');
        } catch (RuntimeException $exception) {
            $this->assertEquals(0, $wallet->fresh()->balance);
            $this->assertEquals(10000, $campaign->fresh()->budget_held);
            $this->assertEquals(0, $campaign->fresh()->budget_refunded);
        }
    }
}
