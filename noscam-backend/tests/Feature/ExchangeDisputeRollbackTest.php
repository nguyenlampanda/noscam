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

class ExchangeDisputeRollbackTest extends TestCase
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


    public function test_approval_rolls_back_when_fee_insert_fails(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();

        \Illuminate\Support\Facades\DB::statement("
            CREATE TRIGGER fail_dispute_fee
            BEFORE INSERT ON exchange_escrow_entries
            WHEN NEW.entry_type = 'fee'
            BEGIN
                SELECT RAISE(ABORT, 'Simulated fee failure');
            END
        ");

        try {
            app(ExchangeDisputeService::class)->resolve(
                $dispute->id,
                $admin,
                'approve',
                'Bằng chứng hợp lệ.'
            );

            $this->fail('Giao dịch phải thất bại.');
        } catch (\Illuminate\Database\QueryException $exception) {
            $this->assertSame('disputed', $claim->fresh()->status);
            $this->assertSame('pending', $dispute->fresh()->status);

            $this->assertNull($dispute->fresh()->resolved_at);

            $this->assertEquals(
                10000,
                $claim->campaign->fresh()->budget_held
            );

            $this->assertEquals(
                0,
                $claim->campaign->fresh()->budget_settled
            );

            $this->assertEquals(
                0,
                Wallet::where('user_id', $worker->id)
                    ->value('balance') ?? 0
            );

            $this->assertSame(
                0,
                ExchangeEscrowEntry::where('claim_id', $claim->id)
                    ->count()
            );
        }
    }

    public function test_refund_rolls_back_when_ledger_insert_fails(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();

        \Illuminate\Support\Facades\DB::statement("
            CREATE TRIGGER fail_dispute_refund
            BEFORE INSERT ON exchange_escrow_entries
            WHEN NEW.entry_type = 'refund'
            BEGIN
                SELECT RAISE(ABORT, 'Simulated refund failure');
            END
        ");

        try {
            app(ExchangeDisputeService::class)->resolve(
                $dispute->id,
                $admin,
                'refund',
                'Bằng chứng không đủ.'
            );

            $this->fail('Giao dịch phải thất bại.');
        } catch (\Illuminate\Database\QueryException $exception) {
            $this->assertSame('disputed', $claim->fresh()->status);
            $this->assertSame('pending', $dispute->fresh()->status);

            $this->assertNull($dispute->fresh()->resolved_at);

            $this->assertEquals(
                0,
                Wallet::where('user_id', $owner->id)
                    ->value('balance')
            );

            $this->assertEquals(
                10000,
                $claim->campaign->fresh()->budget_held
            );

            $this->assertEquals(
                0,
                $claim->campaign->fresh()->budget_refunded
            );

            $this->assertSame(
                0,
                ExchangeEscrowEntry::where('claim_id', $claim->id)
                    ->count()
            );
        }
    }
}
