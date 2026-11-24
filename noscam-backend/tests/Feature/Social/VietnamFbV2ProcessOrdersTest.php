<?php

namespace Tests\Feature\Social;

use App\Models\SocialOrder;
use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use App\Models\SocialService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VietnamFbV2ProcessOrdersTest extends TestCase
{
    use RefreshDatabase;

    private function createOrder(): SocialOrder
    {
        $user = User::factory()->create();

        $service = SocialService::create([
            'code' => 'TEST-V2-PROC',
            'platform' => 'tiktok',
            'category' => 'like',
            'name' => 'Test V2 TikTok Like',
            'min_quantity' => 50,
            'max_quantity' => 5000,
            'sell_price_per_1000' => 180000,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $provider = SocialProvider::create([
            'name' => 'VietnamFB V2 Test',
            'slug' => 'vietnamfb-v2-process-test',
            'driver' => 'vietnamfb_v2',
            'api_url' => 'https://provider.example/api/v2',
            'api_key' => 'fake-v2-key',
            'status' => 'active',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        $mapping = SocialProviderService::create([
            'social_provider_id' => $provider->id,
            'social_service_id' => $service->id,
            'provider_service_id' => '3010',
            'provider_service_name' => 'Tiktok Like - Channel 1',
            'cost_price_per_1000' => 77036.96,
            'min_quantity' => 50,
            'max_quantity' => 5000,
            'is_active' => true,
        ]);

        return SocialOrder::create([
            'code' => 'NS-900071',
            'user_id' => $user->id,
            'social_service_id' => $service->id,
            'social_provider_id' => $provider->id,
            'social_provider_service_id' => $mapping->id,
            'target' => 'https://vt.tiktok.com/ZSsFvDEPa/',
            'quantity' => 115,
            'sell_amount' => 20700,
            'cost_amount' => 8859.25,
            'profit_amount' => 11840.75,
            'status' => 'pending',
            'attempts' => 0,
            'refunded_amount' => 0,
        ]);
    }

    public function test_command_submits_and_syncs_vietnamfb_v2_order_via_mock(): void
    {
        Http::fake([
            '*' => Http::sequence()
                ->push(['order' => 55501], 200)
                ->push([
                    'status' => 'Completed',
                    'start_count' => 10,
                    'remains' => 0,
                ], 200),
        ]);

        $order = $this->createOrder();

        Artisan::call('social:process-orders', ['--limit' => 10]);

        $submitted = $order->fresh();
        $this->assertSame('processing', $submitted->status);
        $this->assertSame('55501', $submitted->provider_order_id);
        $this->assertSame(1, (int) $submitted->attempts);

        Artisan::call('social:process-orders', ['--limit' => 10]);

        $synced = $order->fresh();
        $this->assertSame('completed', $synced->status);
        $this->assertSame(0, (int) $synced->remains);
        $this->assertEquals(0, (float) $synced->refunded_amount);
    }
}
