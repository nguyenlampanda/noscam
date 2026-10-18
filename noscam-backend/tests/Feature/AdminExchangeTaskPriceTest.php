<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminExchangeTaskPriceTest extends TestCase
{
    use RefreshDatabase;

    private function priceData(array $overrides = []): array
    {
        return array_merge([
            'platform' => 'instagram',
            'task_type' => 'follow',
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'is_enabled' => true,
        ], $overrides);
    }

    public function test_guest_cannot_view_admin_prices(): void
    {
        $this->getJson('/api/admin/exchange/prices')
            ->assertUnauthorized();
    }

    public function test_customer_cannot_update_prices(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'sanctum')
            ->putJson(
                '/api/admin/exchange/prices',
                $this->priceData()
            )
            ->assertForbidden();
    }

    public function test_moderator_cannot_update_prices(): void
    {
        $user = User::factory()->create(['role' => 'moderator']);

        $this->actingAs($user, 'sanctum')
            ->putJson(
                '/api/admin/exchange/prices',
                $this->priceData()
            )
            ->assertForbidden();
    }

    public function test_admin_can_create_price(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson(
                '/api/admin/exchange/prices',
                $this->priceData()
            )
            ->assertOk()
            ->assertJsonPath('data.platform', 'instagram')
            ->assertJsonPath('data.task_type', 'follow');

        $this->assertDatabaseHas('exchange_task_prices', [
            'platform' => 'instagram',
            'task_type' => 'follow',
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'updated_by' => $admin->id,
        ]);
    }

    public function test_reward_cannot_exceed_cost(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson(
                '/api/admin/exchange/prices',
                $this->priceData([
                    'cost_per_task' => 1000,
                    'reward_per_task' => 2000,
                ])
            )
            ->assertUnprocessable();
    }

    public function test_zero_reward_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson(
                '/api/admin/exchange/prices',
                $this->priceData(['reward_per_task' => 0])
            )
            ->assertUnprocessable();
    }

    public function test_invalid_platform_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson(
                '/api/admin/exchange/prices',
                $this->priceData(['platform' => 'youtube'])
            )
            ->assertUnprocessable();
    }

    public function test_updating_price_does_not_create_duplicate(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson(
                '/api/admin/exchange/prices',
                $this->priceData()
            )
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->putJson(
                '/api/admin/exchange/prices',
                $this->priceData([
                    'cost_per_task' => 3000,
                    'reward_per_task' => 1500,
                ])
            )
            ->assertOk();

        $this->assertDatabaseCount('exchange_task_prices', 1);

        $this->assertDatabaseHas('exchange_task_prices', [
            'platform' => 'instagram',
            'task_type' => 'follow',
            'cost_per_task' => 3000,
            'reward_per_task' => 1500,
        ]);
    }
}
