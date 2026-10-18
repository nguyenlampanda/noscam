<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ExchangeEscrowHoldTest extends TestCase
{
    use RefreshDatabase;

    private function createCampaign(int $balance = 10000): array
    {
        $user = User::factory()->create();

        $wallet = Wallet::create([
            'user_id' => $user->id,
            'balance' => $balance,
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

        return [$user, $wallet, $campaign];
    }

    public function test_holding_budget_debits_wallet_once(): void
    {
        [, $wallet, $campaign] = $this->createCampaign();

        app(ExchangeEscrowService::class)
            ->holdCampaignBudget($campaign);

        $this->assertEquals(0, $wallet->fresh()->balance);
        $this->assertEquals(10000, $campaign->fresh()->budget_held);
        $this->assertSame('active', $campaign->fresh()->status);

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('campaign_id', $campaign->id)
                ->where('entry_type', 'hold')
                ->count()
        );

        $this->assertSame(
            1,
            WalletTransaction::where('reference_type', 'exchange_campaign')
                ->where('reference_id', $campaign->id)
                ->where('direction', 'debit')
                ->count()
        );
    }

    public function test_repeated_hold_does_not_debit_twice(): void
    {
        [, $wallet, $campaign] = $this->createCampaign();

        $service = app(ExchangeEscrowService::class);

        $service->holdCampaignBudget($campaign);
        $service->holdCampaignBudget($campaign);

        $this->assertEquals(0, $wallet->fresh()->balance);

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('campaign_id', $campaign->id)
                ->where('entry_type', 'hold')
                ->count()
        );
    }

    public function test_insufficient_balance_does_not_change_wallet(): void
    {
        [, $wallet, $campaign] = $this->createCampaign(5000);

        try {
            app(ExchangeEscrowService::class)
                ->holdCampaignBudget($campaign);

            $this->fail('Phải từ chối khi ví không đủ tiền.');
        } catch (RuntimeException $exception) {
            $this->assertEquals(5000, $wallet->fresh()->balance);
            $this->assertEquals(0, $campaign->fresh()->budget_held);
            $this->assertSame(
                0,
                ExchangeEscrowEntry::where('campaign_id', $campaign->id)
                    ->count()
            );
        }
    }
}
