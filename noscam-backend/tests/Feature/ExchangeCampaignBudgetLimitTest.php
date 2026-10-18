<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskPrice;
use App\Models\User;
use App\Services\Social\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeCampaignBudgetLimitTest extends TestCase
{
    use RefreshDatabase;

    private function setupCampaign(): User
    {
        $owner = User::factory()->create();

        app(WalletService::class)->credit(
            $owner, 20000, 'adjustment'
        );

        ExchangeTaskPrice::create([
            'platform' => 'instagram',
            'task_type' => 'follow',
            'cost_per_task' => 3000,
            'reward_per_task' => 1000,
            'min_quantity' => 3,
            'is_enabled' => true,
        ]);

        Sanctum::actingAs($owner);

        return $owner;
    }

    private function payload(int $maxBudget): array
    {
        return [
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/example/',
            'quantity' => 3,
            'rules_accepted' => true,
            'max_budget' => $maxBudget,
        ];
    }

    public function test_price_increase_cannot_exceed_confirmed_budget(): void
    {
        $owner = $this->setupCampaign();

        $this->withHeaders([
            'Idempotency-Key' => 'exchange-budget-limit-test-507',
        ])->postJson(
            '/api/exchange/campaigns',
            $this->payload(6000)
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('max_budget');

        $this->assertSame(0, ExchangeCampaign::count());
        $this->assertSame(0, ExchangeEscrowEntry::count());

        $this->assertEquals(
            20000,
            app(WalletService::class)
                ->getOrCreate($owner)->fresh()->balance
        );
    }

    public function test_confirmed_budget_allows_matching_price(): void
    {
        $owner = $this->setupCampaign();

        $this->withHeaders([
            'Idempotency-Key' => 'exchange-budget-limit-test-508',
        ])->postJson(
            '/api/exchange/campaigns',
            $this->payload(9000)
        )
            ->assertCreated()
            ->assertJsonPath('data.budget_total', 9000);

        $this->assertSame(1, ExchangeCampaign::count());

        $this->assertEquals(
            11000,
            app(WalletService::class)
                ->getOrCreate($owner)->fresh()->balance
        );
    }
}
