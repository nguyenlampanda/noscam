<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExchangeSocialAccountEdgeTest extends TestCase
{
    use RefreshDatabase;

    private function addAccount(User $user, string $platform, string $account): int
    {
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => $platform,
                'account' => $account,
            ])
            ->assertCreated();

        return (int) $response->json('data.id');
    }

    public function test_first_account_is_default(): void
    {
        $user = User::factory()->create();

        $id = $this->addAccount($user, 'instagram', 'first.account');

        $this->assertDatabaseHas('exchange_social_accounts', [
            'id' => $id,
            'is_default' => true,
        ]);
    }

    public function test_switching_default_account(): void
    {
        $user = User::factory()->create();

        $first = $this->addAccount($user, 'instagram', 'first.account');
        $second = $this->addAccount($user, 'instagram', 'second.account');

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/exchange/accounts/{$second}/default")
            ->assertOk();

        $this->assertDatabaseHas('exchange_social_accounts', [
            'id' => $first,
            'is_default' => false,
        ]);

        $this->assertDatabaseHas('exchange_social_accounts', [
            'id' => $second,
            'is_default' => true,
        ]);
    }

    public function test_disabling_default_account(): void
    {
        $user = User::factory()->create();

        $first = $this->addAccount($user, 'instagram', 'first.account');
        $second = $this->addAccount($user, 'instagram', 'second.account');

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/exchange/accounts/{$first}")
            ->assertOk();

        $this->assertDatabaseHas('exchange_social_accounts', [
            'id' => $first,
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('exchange_social_accounts', [
            'id' => $second,
            'is_active' => true,
            'is_default' => true,
        ]);
    }

    public function test_tiktok_profile_url_is_normalized(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'tiktok',
                'account' => 'https://www.tiktok.com/@Example123',
            ])
            ->assertCreated()
            ->assertJsonPath(
                'data.profile_url',
                'https://www.tiktok.com/@example123'
            );
    }

    public function test_facebook_profile_id_is_normalized(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'facebook',
                'account' => 'https://www.facebook.com/profile.php?id=123456789',
            ])
            ->assertCreated()
            ->assertJsonPath(
                'data.profile_url',
                'https://www.facebook.com/profile.php?id=123456789'
            );
    }
}
