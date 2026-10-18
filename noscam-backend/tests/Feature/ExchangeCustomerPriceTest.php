<?php

namespace Tests\Feature;

use App\Models\ExchangeTaskPrice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeCustomerPriceTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_view_exchange_prices(): void
    {
        $this->getJson('/api/exchange/prices')
            ->assertUnauthorized();
    }

    public function test_customer_sees_only_enabled_prices(): void
    {
        ExchangeTaskPrice::create([
            'platform' => 'instagram',
            'task_type' => 'follow',
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'is_enabled' => true,
        ]);

        ExchangeTaskPrice::create([
            'platform' => 'tiktok',
            'task_type' => 'like',
            'cost_per_task' => 3000,
            'reward_per_task' => 1500,
            'is_enabled' => false,
        ]);

        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/exchange/prices')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.platform', 'instagram')
            ->assertJsonPath('data.0.task_type', 'follow')
            ->assertJsonPath('data.0.cost_per_task', 2000)
            ->assertJsonPath('data.0.reward_per_task', 1000)
            ->assertJsonPath('data.0.platform_fee', 1000)
            ->assertJsonPath('data.0.currency', 'VND');

        $item = $response->json('data.0');

        $this->assertSame(
            [
                'platform',
                'task_type',
                'cost_per_task',
                'reward_per_task',
                'min_quantity',
                'platform_fee',
                'currency',
            ],
            array_keys($item)
        );

        $this->assertDatabaseHas('exchange_task_prices', [
            'platform' => 'tiktok',
            'task_type' => 'like',
            'is_enabled' => false,
        ]);
    }

    public function test_empty_prices_return_empty_array(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/exchange/prices')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }
}
