<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExchangeSocialAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_view_accounts(): void
    {
        $this->getJson('/api/exchange/accounts')
            ->assertUnauthorized();
    }

    public function test_user_can_add_instagram_account(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'https://www.instagram.com/Test.User/',
            ])
            ->assertCreated()
            ->assertJsonPath('data.normalized_username', 'test.user')
            ->assertJsonPath(
                'data.profile_url',
                'https://www.instagram.com/test.user/'
            );

        $this->assertDatabaseHas('exchange_social_accounts', [
            'user_id' => $user->id,
            'platform' => 'instagram',
            'normalized_username' => 'test.user',
        ]);
    }

    public function test_other_user_cannot_view_saved_accounts(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'private.owner',
            ])
            ->assertCreated();

        $this->actingAs($other, 'sanctum')
            ->getJson('/api/exchange/accounts')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_duplicate_social_identity_is_rejected(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();

        $this->actingAs($first, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'same.account',
            ])
            ->assertCreated();

        $this->actingAs($second, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'SAME.ACCOUNT',
            ])
            ->assertUnprocessable();
    }

    public function test_user_cannot_disable_another_users_account(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'tiktok',
                'account' => 'testowner123',
            ])
            ->assertCreated();

        $accountId = $response->json('data.id');

        $this->actingAs($other, 'sanctum')
            ->deleteJson("/api/exchange/accounts/{$accountId}")
            ->assertNotFound();
    }

    public function test_invalid_external_domain_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'https://example.com/fakeuser',
            ])
            ->assertUnprocessable();
    }
}
