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
use Illuminate\Support\Facades\DB;
use Throwable;
use Tests\TestCase;

class ExchangeEscrowSettlementRollbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_fee_failure_rolls_back_worker_reward(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $ownerWallet = Wallet::create([
            'user_id' => $owner->id,
            'balance' => 10000,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $workerWallet = Wallet::create([
            'user_id' => $worker->id,
            'balance' => 0,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => 'rollback_worker',
            'normalized_username' => 'rollback_worker',
            'profile_url' => 'https://www.instagram.com/rollback_worker/',
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

        // Chỉ chạy trong SQLite test.
        // Cho phép ghi reward nhưng chặn ghi fee.
        DB::statement("
            CREATE TRIGGER exchange_fee_test_failure
            BEFORE INSERT ON exchange_escrow_entries
            WHEN NEW.entry_type = 'fee'
            BEGIN
                SELECT RAISE(ABORT, 'Simulated fee failure');
            END
        ");

        $failed = false;

        try {
            $service->settleClaim($claim);
        } catch (Throwable $exception) {
            $failed = true;

            $this->assertStringContainsString(
                'Simulated fee failure',
                $exception->getMessage()
            );
        }

        $this->assertTrue($failed);

        $this->assertEquals(
            0,
            $workerWallet->fresh()->balance
        );

        $this->assertEquals(
            0,
            $ownerWallet->fresh()->balance
        );

        $this->assertEquals(
            10000,
            $campaign->fresh()->budget_held
        );

        $this->assertEquals(
            0,
            $campaign->fresh()->budget_settled
        );

        $this->assertSame(
            'submitted',
            $claim->fresh()->status
        );

        $this->assertDatabaseMissing(
            'exchange_escrow_entries',
            [
                'claim_id' => $claim->id,
                'entry_type' => 'reward',
            ]
        );

        $this->assertDatabaseMissing(
            'exchange_escrow_entries',
            [
                'claim_id' => $claim->id,
                'entry_type' => 'fee',
            ]
        );

        $this->assertSame(
            0,
            WalletTransaction::where('user_id', $worker->id)
                ->where('direction', 'credit')
                ->count()
        );
    }
}
