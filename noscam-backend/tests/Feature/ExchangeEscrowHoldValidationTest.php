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

class ExchangeEscrowHoldValidationTest extends TestCase
{
    use RefreshDatabase;

    private function makeCampaign(array $changes = []): array
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

        $campaign = ExchangeCampaign::create(array_merge([
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
        ], $changes));

        return [$wallet, $campaign];
    }

    private function assertHoldRejected(array $changes): void
    {
        [$wallet, $campaign] = $this->makeCampaign($changes);

        try {
            app(ExchangeEscrowService::class)
                ->holdCampaignBudget($campaign);

            $this->fail('Chiến dịch không hợp lệ phải bị từ chối.');
        } catch (RuntimeException $exception) {
            $this->assertEquals(20000, $wallet->fresh()->balance);
            $this->assertEquals(0, $campaign->fresh()->budget_held);

            $this->assertDatabaseMissing('exchange_escrow_entries', [
                'campaign_id' => $campaign->id,
            ]);

            $this->assertSame(
                0,
                WalletTransaction::where(
                    'reference_type',
                    'exchange_campaign'
                )->where('reference_id', $campaign->id)->count()
            );
        }
    }

    public function test_incorrect_budget_is_rejected(): void
    {
        $this->assertHoldRejected([
            'budget_total' => 9000,
        ]);
    }

    public function test_fractional_coins_are_rejected(): void
    {
        $this->assertHoldRejected([
            'cost_per_task' => 2000.5,
        ]);
    }

    public function test_campaign_without_consent_is_rejected(): void
    {
        $this->assertHoldRejected([
            'rules_accepted' => false,
            'rules_accepted_at' => null,
        ]);
    }

    public function test_non_draft_campaign_is_rejected(): void
    {
        $this->assertHoldRejected([
            'status' => 'cancelled',
        ]);
    }
}
