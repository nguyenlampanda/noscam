<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminExchangeIntegerPriceTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_set_fractional_cost(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/exchange/prices', [
                'platform' => 'instagram',
                'task_type' => 'follow',
                'cost_per_task' => 2000.5,
                'reward_per_task' => 1000,
                'is_enabled' => true,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cost_per_task']);
    }

    public function test_admin_cannot_set_fractional_reward(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/exchange/prices', [
                'platform' => 'instagram',
                'task_type' => 'follow',
                'cost_per_task' => 2000,
                'reward_per_task' => 1000.5,
                'is_enabled' => true,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reward_per_task']);
    }
}
