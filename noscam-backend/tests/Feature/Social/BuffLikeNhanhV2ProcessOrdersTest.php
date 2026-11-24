<?php

namespace Tests\Feature\Social;

use App\Models\SocialOrder;
use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use App\Models\SocialService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BuffLikeNhanhV2ProcessOrdersTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_submits_and_syncs_bufflikenhanh_v2_orders(): void
    {
        Http::fake(function ($request) {
            $data = $request->data();
            $action = $data['action'] ?? null;

            if ($action === 'add') {
                return Http::response([
                    'order' => '88991',
                ], 200);
            }

            if ($action === 'status') {
                return Http::response([
                    'status' => 'In progress',
                    'start_count' => '12',
                    'remains' => '88',
                    'charge' => '0.5',
                ], 200);
            }

            return Http::response(['error' => 'Unsupported action'], 400);
        });

        $user = User::factory()->create();

        $provider = SocialProvider::create([
            'name' => 'BLN V2',
            'slug' => 'bufflikenhanh-v2',
            'driver' => 'bufflikenhanh_v2',
            'api_url' => 'https://bufflikenhanh.com/api/v2',
            'api_key' => 'test-bln-v2-key',
            'status' => 'active',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        $service = SocialService::create([
            'code' => 'BLN-V2-TEST',
            'platform' => 'tiktok',
            'category' => 'like',
            'name' => 'BuffLikeNhanh V2 Like Test',
            'sell_price_per_1000' => 20000,
            'min_quantity' => 50,
            'max_quantity' => 10000,
            'is_active' => true,
        ]);

        $providerService = SocialProviderService::create([
            'social_provider_id' => $provider->id,
            'social_service_id' => $service->id,
            'provider_service_id' => '501',
            'provider_service_name' => 'TikTok Like V2',
            'cost_price_per_1000' => 10000,
            'cost_price_vnd' => 10000,
            'min_quantity' => 50,
            'max_quantity' => 10000,
            'is_active' => true,
            'provider_availability' => 'available',
        ]);

        $order = SocialOrder::create([
            'code' => 'NS-BLN001',
            'user_id' => $user->id,
            'social_service_id' => $service->id,
            'social_provider_id' => $provider->id,
            'social_provider_service_id' => $providerService->id,
            'target' => 'https://www.tiktok.com/@test/video/123',
            'quantity' => 100,
            'sell_amount' => 2000,
            'cost_amount' => 1000,
            'profit_amount' => 1000,
            'status' => 'pending',
            'attempts' => 0,
        ]);

        $this->artisan('social:process-orders', ['--limit' => 10])
            ->assertExitCode(0);

        $order->refresh();
        $this->assertSame('88991', (string) $order->provider_order_id);
        $this->assertSame(1, (int) $order->attempts);
        $this->assertContains($order->status, ['pending', 'processing', 'in_progress']);

        $this->artisan('social:process-orders', ['--limit' => 10])
            ->assertExitCode(0);

        $order->refresh();
        $this->assertSame('in_progress', $order->status);
        $this->assertSame(12, (int) $order->start_count);
        $this->assertSame(88, (int) $order->remains);
    }
}
