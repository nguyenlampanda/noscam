<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskPrice;
use App\Models\User;
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

        app(WalletService::class)->credit(
            $owner,
            10000,
            'adjustment'
        );

        $this->price();

        Sanctum::actingAs($owner);
        $this->withHeaders([
            'Idempotency-Key' => 'exchange-api-test-key-401',
        ]);

        $this->postJson(
            '/api/exchange/campaigns',
            $this->payload()
        )
            ->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.quantity', 3)
            ->assertJsonPath('data.cost_per_task', 2000)
            ->assertJsonPath('data.reward_per_task', 1000)
            ->assertJsonPath('data.budget_total', 6000)
            ->assertJsonPath('data.budget_held', 6000);

        $this->assertSame(1, ExchangeCampaign::count());

        $this->assertEquals(
            4000,
            app(WalletService::class)
                ->getOrCreate($owner)
                ->fresh()
                ->balance
        );

        $this->assertSame(
            1,
            ExchangeEscrowEntry::query()
                ->where('entry_type', 'hold')
                ->count()
        );
    }

    public function test_client_cannot_override_admin_price(): void
    {
        $owner = User::factory()->create();

        app(WalletService::class)->credit(
            $owner,
            10000,
            'adjustment'
        );

        $this->price();

        Sanctum::actingAs($owner);
        $this->withHeaders([
            'Idempotency-Key' => 'exchange-api-test-key-401',
        ]);

        $payload = $this->payload();
        $payload['cost_per_task'] = 1;
        $payload['reward_per_task'] = 1;
        $payload['budget_total'] = 3;

        $this->postJson(
            '/api/exchange/campaigns',
            $payload
        )
            ->assertCreated()
            ->assertJsonPath('data.cost_per_task', 2000)
            ->assertJsonPath('data.reward_per_task', 1000)
            ->assertJsonPath('data.budget_total', 6000);

        $this->assertEquals(
            4000,
            app(WalletService::class)
                ->getOrCreate($owner)
                ->fresh()
                ->balance
        );
    }

    public function test_insufficient_coins_rolls_back_http_request(): void
    {
        $owner = User::factory()->create();

        app(WalletService::class)->credit(
            $owner,
            1000,
            'adjustment'
        );

        $this->price();

        Sanctum::actingAs($owner);
        $this->withHeaders([
            'Idempotency-Key' => 'exchange-api-test-key-401',
        ]);

        $before = WalletTransaction::count();

        $this->postJson(
            '/api/exchange/campaigns',
            $this->payload()
        )->assertUnprocessable();

        $this->assertSame(0, ExchangeCampaign::count());
        $this->assertSame(0, ExchangeEscrowEntry::count());
        $this->assertSame($before, WalletTransaction::count());

        $this->assertEquals(
            1000,
            app(WalletService::class)
                ->getOrCreate($owner)
                ->fresh()
                ->balance
        );
    }

    public function test_terms_are_required(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $this->withHeaders([
            'Idempotency-Key' => 'exchange-api-test-key-401',
        ]);

        $payload = $this->payload();
        $payload['rules_accepted'] = false;

        $this->postJson(
            '/api/exchange/campaigns',
            $payload
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rules_accepted');

        $this->assertSame(0, ExchangeCampaign::count());
    }

    public function test_wrong_platform_url_is_rejected(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $this->withHeaders([
            'Idempotency-Key' => 'exchange-api-test-key-401',
        ]);

        $payload = $this->payload();
        $payload['target_url'] = 'https://www.tiktok.com/@example';

        $this->postJson(
            '/api/exchange/campaigns',
            $payload
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('target_url');

        $this->assertSame(0, ExchangeCampaign::count());
    }
}
