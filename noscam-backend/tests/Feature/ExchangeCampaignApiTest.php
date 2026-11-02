<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskPrice;
use App\Models\User;
use App\Services\Exchange\ExchangeCampaignService;
use App\Models\WalletTransaction;
use App\Services\Social\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeCampaignApiTest extends TestCase
{
    use RefreshDatabase;

    private function price(): void
    {
        ExchangeTaskPrice::create([
            'platform' => 'instagram',
            'task_type' => 'follow',
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'min_quantity' => 3,
            'is_enabled' => true,
        ]);
    }

    private function payload(): array
    {
        return [
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/example/',
            'quantity' => 3,
            'rules_accepted' => true,
        ];
    }

    public function test_guest_cannot_create_campaign(): void
    {
        $this->postJson(
            '/api/exchange/campaigns',
            $this->payload()
        )->assertUnauthorized();

        $this->assertSame(0, ExchangeCampaign::count());
    }


    public function test_customer_creates_campaign_and_pays_exact_budget(): void
    {
        $owner = User::factory()->create();
        app(WalletService::class)->credit($owner, 10000, 'adjustment');
        $this->price();

        $payload = $this->payload();

        $campaign = app(ExchangeCampaignService::class)->create(
            $owner, $payload['platform'], $payload['task_type'],
            $payload['target_url'], $payload['quantity'], true,
            'exchange-api-test-key-401'
        );

        $this->assertSame('active', $campaign->status);
        $this->assertSame(3, (int) $campaign->quantity);
        $this->assertEquals(2000, $campaign->cost_per_task);
        $this->assertEquals(1000, $campaign->reward_per_task);
        $this->assertEquals(6000, $campaign->budget_total);
        $this->assertEquals(6000, $campaign->budget_held);
        $this->assertSame(1, ExchangeCampaign::count());

        $this->assertEquals(
            4000,
            app(WalletService::class)->getOrCreate($owner)->fresh()->balance
        );

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('entry_type', 'hold')->count()
        );
    }

    public function test_client_cannot_override_admin_price(): void
    {
        $owner = User::factory()->create();
        app(WalletService::class)->credit($owner, 10000, 'adjustment');
        $this->price();

        $payload = $this->payload();
        $payload['cost_per_task'] = 1;
        $payload['reward_per_task'] = 1;
        $payload['budget_total'] = 3;

        // Service không nhận giá từ client.
        $campaign = app(ExchangeCampaignService::class)->create(
            $owner, $payload['platform'], $payload['task_type'],
            $payload['target_url'], $payload['quantity'], true,
            'exchange-price-test-key-401'
        );

        $this->assertEquals(2000, $campaign->cost_per_task);
        $this->assertEquals(1000, $campaign->reward_per_task);
        $this->assertEquals(6000, $campaign->budget_total);

        $this->assertEquals(
            4000,
            app(WalletService::class)->getOrCreate($owner)->fresh()->balance
        );
    }

    public function test_insufficient_coins_rolls_back_http_request(): void
    {
        $owner = User::factory()->create();
        app(WalletService::class)->credit($owner, 1000, 'adjustment');
        $this->price();

        $before = WalletTransaction::count();

        try {
            $payload = $this->payload();

            app(ExchangeCampaignService::class)->create(
                $owner, $payload['platform'], $payload['task_type'],
                $payload['target_url'], $payload['quantity'], true,
                'exchange-low-balance-key-401'
            );

            $this->fail('Phải từ chối khi số dư không đủ.');
        } catch (\RuntimeException $e) {
            $this->assertSame('Số dư không đủ.', $e->getMessage());
        }

        $this->assertSame(0, ExchangeCampaign::count());
        $this->assertSame(0, ExchangeEscrowEntry::count());
        $this->assertSame($before, WalletTransaction::count());

        $this->assertEquals(
            1000,
            app(WalletService::class)->getOrCreate($owner)->fresh()->balance
        );
    }


    public function test_terms_are_required(): void
    {
        $owner = User::factory()->create();

        try {
            app(ExchangeCampaignService::class)->create(
                $owner, 'instagram', 'follow',
                'https://www.instagram.com/example/',
                3, false, 'exchange-terms-test-key-401'
            );
            $this->fail('Phải yêu cầu đồng ý điều khoản.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertArrayHasKey('rules_accepted', $e->errors());
        }

        $this->assertSame(0, ExchangeCampaign::count());
    }

    public function test_wrong_platform_url_is_rejected(): void
    {
        $owner = User::factory()->create();

        try {
            app(ExchangeCampaignService::class)->create(
                $owner, 'instagram', 'follow',
                'https://www.tiktok.com/@example',
                3, true, 'exchange-url-test-key-401'
            );
            $this->fail('Phải từ chối URL sai nền tảng.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertArrayHasKey('target_url', $e->errors());
        }

        $this->assertSame(0, ExchangeCampaign::count());
    }
}
