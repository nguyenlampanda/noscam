<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\Exchange\ExchangeCampaignCancellationService;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ExchangeCampaignCancellationTest extends TestCase
{
    use RefreshDatabase;

    private function prepareCampaign(): array
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();

        $wallet = Wallet::create([
            'user_id' => $owner->id,
            'balance' => 20000,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $campaign = ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/testtarget/',
            'quantity' => 10,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 20000,
            'budget_held' => 0,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => 'draft',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);

        app(ExchangeEscrowService::class)->holdCampaignBudget($campaign);

        $campaign->refresh();
        $campaign->status = 'cancelling';
        $campaign->save();

        return [$owner, $admin, $wallet, $campaign];
    }

    private function finalize(ExchangeCampaign $campaign, User $admin): array
    {
        return app(ExchangeCampaignCancellationService::class)->finalize(
            $campaign->id,
            $admin->id,
            'Hủy chiến dịch theo yêu cầu kiểm thử.'
        );
    }

    private function createClaim(
        ExchangeCampaign $campaign,
        string $status,
        int $number
    ): ExchangeTaskClaim {
        $worker = User::factory()->create();

        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => 'cancel_worker_'.$number,
            'normalized_username' => 'cancel_worker_'.$number,
            'profile_url' => 'https://www.instagram.com/cancel_worker_'.$number.'/',
            'is_default' => true,
            'is_active' => true,
        ]);

        return ExchangeTaskClaim::create([
            'campaign_id' => $campaign->id,
            'worker_user_id' => $worker->id,
            'social_account_id' => $account->id,
            'status' => $status,
            'claimed_at' => now()->subDays(5),
            'risk_hold' => false,
        ]);
    }

    public function test_full_unused_budget_is_refunded(): void
    {
        [$owner, $admin, $wallet, $campaign] = $this->prepareCampaign();

        $result = $this->finalize($campaign, $admin);

        $this->assertSame('cancelled', $result['status']);
        $this->assertEquals(20000, $result['refunded_now']);
        $this->assertEquals(20000, $wallet->fresh()->balance);
        $this->assertEquals(0, $campaign->fresh()->budget_held);
        $this->assertEquals(20000, $campaign->fresh()->budget_refunded);

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('campaign_id', $campaign->id)
                ->where('entry_type', 'refund')
                ->whereNull('claim_id')
                ->count()
        );

        $this->assertSame(
            1,
            WalletTransaction::where('user_id', $owner->id)
                ->where('direction', 'credit')
                ->count()
        );
    }

    public function test_repeated_finalize_never_credits_twice(): void
    {
        [$owner, $admin, $wallet, $campaign] = $this->prepareCampaign();

        $this->finalize($campaign, $admin);
        $second = $this->finalize($campaign, $admin);

        $this->assertTrue($second['already_cancelled']);
        $this->assertEquals(20000, $wallet->fresh()->balance);
        $this->assertSame(
            1,
            WalletTransaction::where('user_id', $owner->id)
                ->where('direction', 'credit')
                ->count()
        );
    }

    public function test_pending_claim_blocks_cancellation(): void
    {
        [, $admin, $wallet, $campaign] = $this->prepareCampaign();

        $this->createClaim($campaign, 'claimed', 1);

        try {
            $this->finalize($campaign, $admin);
            $this->fail('Không được hoàn xu khi claim chưa hoàn tất.');
        } catch (\RuntimeException $exception) {
            $this->assertEquals(0, $wallet->fresh()->balance);
            $this->assertEquals(20000, $campaign->fresh()->budget_held);
            $this->assertSame('cancelling', $campaign->fresh()->status);
        }
    }

    public function test_escrow_insert_failure_rolls_back_wallet(): void
    {
        [$owner, $admin, $wallet, $campaign] = $this->prepareCampaign();

        DB::statement("
            CREATE TRIGGER cancellation_refund_failure
            BEFORE INSERT ON exchange_escrow_entries
            WHEN NEW.entry_type = 'refund' AND NEW.claim_id IS NULL
            BEGIN
                SELECT RAISE(ABORT, 'Simulated cancellation failure');
            END
        ");

        try {
            $this->finalize($campaign, $admin);
            $this->fail('Phải rollback khi ghi escrow thất bại.');
        } catch (\Throwable $exception) {
            $this->assertStringContainsString(
                'Simulated cancellation failure',
                $exception->getMessage()
            );
        }

        $this->assertEquals(0, $wallet->fresh()->balance);
        $this->assertEquals(20000, $campaign->fresh()->budget_held);
        $this->assertEquals(0, $campaign->fresh()->budget_refunded);
        $this->assertSame('cancelling', $campaign->fresh()->status);

        $this->assertSame(
            0,
            WalletTransaction::where('user_id', $owner->id)
                ->where('direction', 'credit')
                ->count()
        );
    }

    public function test_partial_refund_after_finalized_claim(): void
    {
        [$owner, $admin, $wallet, $campaign] = $this->prepareCampaign();

        $claim = $this->createClaim($campaign, 'rejected', 2);
        $claim->update([
            'submitted_at' => now()->subDays(4),
            'review_deadline_at' => now()->subDays(2),
            'rejected_at' => now()->subDays(3),
            'appeal_deadline_at' => now()->subDay(),
            'rejection_reason' => 'Không xác minh được nhiệm vụ.',
        ]);

        app(ExchangeEscrowService::class)->refundClaim($claim);

        $result = $this->finalize($campaign, $admin);

        $this->assertEquals(18000, $result['refunded_now']);
        $this->assertEquals(20000, $wallet->fresh()->balance);
        $this->assertEquals(0, $campaign->fresh()->budget_held);
        $this->assertEquals(20000, $campaign->fresh()->budget_refunded);
        $this->assertSame('cancelled', $campaign->fresh()->status);

        $this->assertSame(
            2,
            WalletTransaction::where('user_id', $owner->id)
                ->where('direction', 'credit')
                ->count()
        );
    }

    private function assertLedgerRejected(
        ExchangeCampaign $campaign,
        User $admin,
        Wallet $wallet
    ): void {
        $balanceBefore = $wallet->fresh()->balance;
        $heldBefore = $campaign->fresh()->budget_held;
        $refundedBefore = $campaign->fresh()->budget_refunded;
        $creditsBefore = WalletTransaction::where(
            'user_id', $campaign->user_id
        )->where('direction', 'credit')->count();

        try {
            $this->finalize($campaign, $admin);
            $this->fail('Ledger sai không được hoàn xu.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString(
                'Giao dịch ví và Escrow không khớp.',
                $e->getMessage()
            );
        }

        $this->assertEquals($balanceBefore, $wallet->fresh()->balance);
        $this->assertEquals($heldBefore, $campaign->fresh()->budget_held);
        $this->assertEquals(
            $refundedBefore, $campaign->fresh()->budget_refunded
        );
        $this->assertSame('cancelling', $campaign->fresh()->status);
        $this->assertSame(
            $creditsBefore,
            WalletTransaction::where('user_id', $campaign->user_id)
                ->where('direction', 'credit')->count()
        );
        $this->assertSame(
            0,
            ExchangeEscrowEntry::where('campaign_id', $campaign->id)
                ->where('entry_type', 'refund')
                ->whereNull('claim_id')->count()
        );
    }

    private function ledgerHoldId(ExchangeCampaign $campaign): int
    {
        return (int) ExchangeEscrowEntry::where(
            'campaign_id', $campaign->id
        )->where('entry_type', 'hold')->firstOrFail()->wallet_transaction_id;
    }

    private function ledgerRefundedClaim(
        ExchangeCampaign $campaign,
        int $number
    ): ExchangeTaskClaim {
        $claim = $this->createClaim($campaign, 'rejected', $number);
        $claim->update([
            'submitted_at' => now()->subDays(4),
            'review_deadline_at' => now()->subDays(2),
            'rejected_at' => now()->subDays(3),
            'appeal_deadline_at' => now()->subDay(),
            'rejection_reason' => 'Kiểm thử ledger.',
        ]);
        app(ExchangeEscrowService::class)->refundClaim($claim);
        return $claim->fresh();
    }

    public function test_ledger_rejects_wrong_hold_user(): void
    {
        [, $admin, $wallet, $campaign] = $this->prepareCampaign();
        $other = User::factory()->create();

        DB::table('wallet_transactions')
            ->where('id', $this->ledgerHoldId($campaign))
            ->update(['user_id' => $other->id]);

        $this->assertLedgerRejected($campaign, $admin, $wallet);
    }

    public function test_ledger_rejects_wrong_hold_wallet(): void
    {
        [, $admin, $wallet, $campaign] = $this->prepareCampaign();
        $other = User::factory()->create();

        $otherWallet = Wallet::create([
            'user_id' => $other->id,
            'balance' => 0,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        DB::table('wallet_transactions')
            ->where('id', $this->ledgerHoldId($campaign))
            ->update(['wallet_id' => $otherWallet->id]);

        $this->assertLedgerRejected($campaign, $admin, $wallet);
    }

    public function test_ledger_rejects_wrong_hold_reference(): void
    {
        [, $admin, $wallet, $campaign] = $this->prepareCampaign();

        DB::table('wallet_transactions')
            ->where('id', $this->ledgerHoldId($campaign))
            ->update(['reference_id' => $campaign->id + 999999]);

        $this->assertLedgerRejected($campaign, $admin, $wallet);
    }

    public function test_ledger_rejects_wrong_refund_recipient(): void
    {
        [, $admin, $wallet, $campaign] = $this->prepareCampaign();
        $claim = $this->ledgerRefundedClaim($campaign, 101);

        $entry = ExchangeEscrowEntry::where('claim_id', $claim->id)
            ->where('entry_type', 'refund')->firstOrFail();

        $other = User::factory()->create();

        DB::table('wallet_transactions')
            ->where('id', $entry->wallet_transaction_id)
            ->update(['user_id' => $other->id]);

        $this->assertLedgerRejected($campaign, $admin, $wallet);
    }

    public function test_ledger_rejects_duplicate_wallet_transaction(): void
    {
        [, $admin, $wallet, $campaign] = $this->prepareCampaign();
        $first = $this->ledgerRefundedClaim($campaign, 102);
        $second = $this->ledgerRefundedClaim($campaign, 103);

        $firstEntry = ExchangeEscrowEntry::where('claim_id', $first->id)
            ->where('entry_type', 'refund')->firstOrFail();

        $secondEntry = ExchangeEscrowEntry::where('claim_id', $second->id)
            ->where('entry_type', 'refund')->firstOrFail();

        $secondEntry->wallet_transaction_id =
            $firstEntry->wallet_transaction_id;
        $secondEntry->save();

        $this->assertLedgerRejected($campaign, $admin, $wallet);
    }


    public function test_cancelled_campaign_rejects_corrupted_refund_transaction(): void
    {
        [, $admin, $wallet, $campaign] = $this->prepareCampaign();

        $this->finalize($campaign, $admin);

        $entry = ExchangeEscrowEntry::query()
            ->where('campaign_id', $campaign->id)
            ->where('entry_type', 'refund')
            ->whereNull('claim_id')
            ->firstOrFail();

        DB::table('wallet_transactions')
            ->where('id', $entry->wallet_transaction_id)
            ->update(['reference_id' => $campaign->id + 999999]);

        $before = $wallet->fresh()->balance;

        $rejected = false;

        try {
            $this->finalize($campaign, $admin);
        } catch (\RuntimeException $exception) {
            $rejected = true;
        }

        $this->assertTrue(
            $rejected,
            'Chiến dịch đã hủy phải từ chối ledger hoàn xu bị chỉnh sửa.'
        );
        $this->assertEquals($before, $wallet->fresh()->balance);
        $this->assertSame('cancelled', $campaign->fresh()->status);
    }

    public function test_cancelled_campaign_with_valid_ledger_is_idempotent(): void
    {
        [$owner, $admin, $wallet, $campaign] = $this->prepareCampaign();

        $first = $this->finalize($campaign, $admin);
        $before = $wallet->fresh()->balance;

        $second = $this->finalize($campaign, $admin);

        $this->assertFalse($first['already_cancelled']);
        $this->assertTrue($second['already_cancelled']);
        $this->assertEquals(0, $second['refunded_now']);
        $this->assertEquals($before, $wallet->fresh()->balance);

        $this->assertSame(
            1,
            WalletTransaction::query()
                ->where('user_id', $owner->id)
                ->where('direction', 'credit')
                ->count()
        );
    }


    public function test_ledger_rejects_reward_paid_to_wrong_worker(): void
    {
        [, $admin, $wallet, $campaign] = $this->prepareCampaign();

        $claim = $this->createClaim($campaign, 'submitted', 991);

        $claim->update([
            'submitted_at' => now()->subDays(4),
            'review_deadline_at' => now()->subDays(2),
            'submitted_username' => 'cancel_worker_991',
            'submitted_profile_url' =>
                'https://www.instagram.com/cancel_worker_991/',
        ]);

        app(ExchangeEscrowService::class)->settleClaim($claim);

        $claim->refresh();

        $this->assertSame('settled', $claim->status);

        $reward = ExchangeEscrowEntry::query()
            ->where('campaign_id', $campaign->id)
            ->where('claim_id', $claim->id)
            ->where('entry_type', 'reward')
            ->firstOrFail();

        $wrongWorker = User::factory()->create();

        DB::table('wallet_transactions')
            ->where('id', $reward->wallet_transaction_id)
            ->update(['user_id' => $wrongWorker->id]);

        $beforeBalance = $wallet->fresh()->balance;
        $beforeHeld = $campaign->fresh()->budget_held;

        $rejected = false;

        try {
            $this->finalize($campaign, $admin);
        } catch (\RuntimeException $exception) {
            $rejected = true;

            $this->assertStringContainsString(
                'Giao dịch ví và Escrow không khớp.',
                $exception->getMessage()
            );
        }

        $this->assertTrue(
            $rejected,
            'Phải từ chối reward thuộc sai worker.'
        );

        $this->assertEquals(
            $beforeBalance,
            $wallet->fresh()->balance
        );

        $this->assertEquals(
            $beforeHeld,
            $campaign->fresh()->budget_held
        );

        $this->assertSame(
            'cancelling',
            $campaign->fresh()->status
        );

        $this->assertSame(
            0,
            ExchangeEscrowEntry::query()
                ->where('campaign_id', $campaign->id)
                ->where('entry_type', 'refund')
                ->whereNull('claim_id')
                ->count()
        );
    }

}
