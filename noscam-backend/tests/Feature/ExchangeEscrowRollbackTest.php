<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Throwable;
use Tests\TestCase;

class ExchangeEscrowRollbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_failed_escrow_insert_rolls_back_wallet_debit(): void
    {
        $user = User::factory()->create();

        $wallet = Wallet::create([
            'user_id' => $user->id,
            'balance' => 20000,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $campaign = ExchangeCampaign::create([
            'user_id' => $user->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/example/',
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

        // Trigger chỉ được tạo trong SQLite test.
        // Cố tình làm INSERT ký quỹ thất bại.
        DB::statement("
            CREATE TRIGGER exchange_escrow_test_failure
            BEFORE INSERT ON exchange_escrow_entries
            BEGIN
                SELECT RAISE(ABORT, 'Simulated escrow failure');
            END
        ");

        $failed = false;

        try {
            app(ExchangeEscrowService::class)
                ->holdCampaignBudget($campaign);
        } catch (Throwable $exception) {
            $failed = true;

            $this->assertStringContainsString(
                'Simulated escrow failure',
                $exception->getMessage()
            );
        }

        $this->assertTrue(
            $failed,
            'Thao tác ghi ký quỹ phải thất bại.'
        );

        $this->assertEquals(
            20000,
            $wallet->fresh()->balance
        );

        $this->assertEquals(
            0,
            $campaign->fresh()->budget_held
        );

        $this->assertSame(
            'draft',
            $campaign->fresh()->status
        );

        $this->assertDatabaseMissing(
            'exchange_escrow_entries',
            ['campaign_id' => $campaign->id]
        );

        $this->assertSame(
            0,
            WalletTransaction::where(
                'reference_type',
                'exchange_campaign'
            )->where(
                'reference_id',
                $campaign->id
            )->count()
        );
    }
}
