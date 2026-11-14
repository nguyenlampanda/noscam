<?php

namespace Tests\Feature\Social;

use App\Models\SocialProvider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VietnamFbV2BalanceSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function provider(): SocialProvider
    {
        Sanctum::actingAs(
            User::factory()->create(['role' => 'admin']),
            ['*']
        );

        return SocialProvider::create([
            'name' => 'VietnamFB V2 Balance Test',
            'slug' => 'vietnamfb-v2-balance-test',
            'driver' => 'vietnamfb_v2',
            'api_url' => 'https://example.com/api/v2',
            'api_key' => 'fake-test-key',
            'status' => 'inactive',
            'currency' => 'USD',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);
    }

    public function test_success_does_not_activate_v2(): void
    {
        $provider = $this->provider();

        Http::preventStrayRequests();
        Http::fake([
            'example.com/*' => Http::response([
                'balance' => '5.63448',
                'currency' => 'USD',
            ]),
        ]);

        $response = $this->postJson(
            "/api/admin/social/providers/{$provider->id}/test"
        )->assertOk()
         ->assertJsonPath('data.currency', 'USD');

        $this->assertEqualsWithDelta(
            146496.48,
            (float) $response->json('data.balance_vnd'),
            0.01
        );

        $this->assertSame('inactive', $provider->fresh()->status);
        Http::assertSentCount(1);
    }

    public function test_failed_connection_does_not_activate_v2(): void
    {
        $provider = $this->provider();

        Http::preventStrayRequests();
        Http::fake([
            'example.com/*' => Http::response([
                'error' => 'Invalid API key',
            ], 403),
        ]);

        $this->postJson(
            "/api/admin/social/providers/{$provider->id}/test"
        )->assertStatus(422);

        $this->assertSame('inactive', $provider->fresh()->status);
        Http::assertSentCount(2);
    }

    public function test_refresh_balance_converts_usd_to_vnd(): void
    {
        $provider = $this->provider();

        Http::preventStrayRequests();
        Http::fake([
            'example.com/*' => Http::response([
                'balance' => '5.63448',
                'currency' => 'USD',
            ]),
        ]);

        $response = $this->postJson(
            "/api/admin/social/providers/{$provider->id}/refresh-balance"
        )->assertOk()
         ->assertJsonPath('data.currency', 'USD');

        $this->assertEqualsWithDelta(
            146496.48,
            (float) $response->json('data.balance_vnd'),
            0.01
        );

        $this->assertSame('inactive', $provider->fresh()->status);
        Http::assertSentCount(1);
    }
}
