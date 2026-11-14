<?php

namespace Tests\Feature\Social;

use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VietnamFbV2SyncPricingTest extends TestCase
{
    use RefreshDatabase;

    public function test_v2_sync_converts_usd_rates_and_rejects_invalid_limits(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin, ['*']);

        $provider = SocialProvider::create([
            'name' => 'VietnamFB V2 Pricing Test',
            'slug' => 'vietnamfb-v2-pricing-test',
            'driver' => 'vietnamfb_v2',
            'api_url' => 'https://example.com/api/v2',
            'api_key' => 'fake-test-key',
            'status' => 'inactive',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        Http::preventStrayRequests();

        Http::fake([
            'example.com/*' => Http::response([
                [
                    'service' => 3004,
                    'name' => 'Instagram Follow',
                    'rate' => '1.48148',
                    'min' => 50,
                    'max' => 2000,
                ],
                [
                    'service' => 9999,
                    'name' => 'Invalid Service',
                    'rate' => '2',
                    'min' => 500,
                    'max' => 0,
                ],
            ], 200),
        ]);

        $this->postJson(
            "/api/admin/social/providers/{$provider->id}/sync"
        )->assertOk();

        $valid = SocialProviderService::query()
            ->where('social_provider_id', $provider->id)
            ->where('provider_service_id', '3004')
            ->firstOrFail();

        $this->assertEqualsWithDelta(
            38518.48,
            (float) $valid->cost_price_per_1000,
            0.001
        );

        $this->assertSame(50, (int) $valid->min_quantity);
        $this->assertSame(2000, (int) $valid->max_quantity);

        $this->assertFalse(
            SocialProviderService::query()
                ->where('social_provider_id', $provider->id)
                ->where('provider_service_id', '9999')
                ->exists()
        );

        $this->assertSame('inactive', $provider->fresh()->status);
    }
}
