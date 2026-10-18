<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskPrice;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\Exchange\ExchangeCampaignService;
use App\Services\Social\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Tests\TestCase;

class ExchangeCampaignCreationTest extends TestCase
{
    use RefreshDatabase;

    private function price(
        bool $enabled = true,
        string $cost = '2000',
        string $reward = '1000'
    ): void {
        ExchangeTaskPrice::create([
            'platform' => 'instagram',
            'task_type' => 'follow',
            'cost_per_task' => $cost,
            'reward_per_task' => $reward,
            'min_quantity' => 3,
            'is_enabled' => $enabled,
        ]);
    }

    private function createCampaign(User $owner): ExchangeCampaign
    {
        return app(ExchangeCampaignService::class)->create(
            $owner,
            'instagram',
            'follow',
            'https://www.instagram.com/example/',
            3,
            true
        );
    }

    public function test_successful_creation_holds_exact_budget(): void
    {
        $owner = User::factory()->create();

        app(WalletService::class)->credit(
            $owner,
            10000,
            'adjustment'
        );

        $this->price();

        $campaign = $this->createCampaign($owner);

        $this->assertSame('active', $campaign->status);
        $this->assertSame(3, $campaign->quantity);
        $this->assertEquals(6000, $campaign->budget_total);
        $this->assertEquals(6000, $campaign->budget_held);
        $this->assertEquals(2000, $campaign->cost_per_task);
        $this->assertEquals(1000, $campaign->reward_per_task);

        $this->assertEquals(
            4000,
            app(WalletService::class)
                ->getOrCreate($owner)
                ->fresh()
                ->balance
        );

        $this->assertSame(1, ExchangeCampaign::count());

        $this->assertSame(
            1,
            ExchangeEscrowEntry::query()
                ->where('campaign_id', $campaign->id)
                ->where('entry_type', 'hold')
                ->count()
        );
    }

    public function test_insufficient_balance_rolls_back_campaign(): void
    {
        $owner = User::factory()->create();

        app(WalletService::class)->credit(
            $owner,
            1000,
            'adjustment'
        );

        $this->price();

        $beforeTransactions = WalletTransaction::count();

        try {
            $this->createCampaign($owner);
            $this->fail('Phải từ chối khi không đủ xu.');
        } catch (RuntimeException $exception) {
            $this->assertNotEmpty($exception->getMessage());
        }

        $this->assertSame(0, ExchangeCampaign::count());
        $this->assertSame(0, ExchangeEscrowEntry::count());
        $this->assertSame(
            $beforeTransactions,
            WalletTransaction::count()
        );

        $this->assertEquals(
            1000,
            app(WalletService::class)
                ->getOrCreate($owner)
                ->fresh()
                ->balance
        );
    }

    public function test_disabled_price_cannot_create_campaign(): void
    {
        $owner = User::factory()->create();

        $this->price(false);

        $this->expectException(ValidationException::class);

        try {
            $this->createCampaign($owner);
        } finally {
            $this->assertSame(0, ExchangeCampaign::count());
        }
    }

    public function test_fractional_coin_price_is_rejected(): void
    {
        $owner = User::factory()->create();

        $this->price(true, '2000.5000', '1000');

        $this->expectException(RuntimeException::class);

        try {
            $this->createCampaign($owner);
        } finally {
            $this->assertSame(0, ExchangeCampaign::count());
            $this->assertSame(0, ExchangeEscrowEntry::count());
        }
    }

    public function test_wrong_platform_url_is_rejected(): void
    {
        $owner = User::factory()->create();

        $this->price();

        $this->expectException(ValidationException::class);

        try {
            app(ExchangeCampaignService::class)->create(
                $owner,
                'instagram',
                'follow',
                'https://www.tiktok.com/@example',
                3,
                true
            );
        } finally {
            $this->assertSame(0, ExchangeCampaign::count());
        }
    }
}
