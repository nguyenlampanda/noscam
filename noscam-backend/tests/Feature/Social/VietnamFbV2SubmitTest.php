<?php

namespace Tests\Feature\Social;

use App\Models\SocialOrder;
use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use App\Models\SocialService;
use App\Models\User;
use App\Services\Social\SocialOrderProviderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class VietnamFbV2SubmitTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(): SocialOrder
    {
        $user = User::factory()->create();

        $service = SocialService::create([
            'code' => 'TEST-V2-SUBMIT',
            'platform' => 'instagram',
            'category' => 'followers',
            'name' => 'Test V2 Followers',
            'min_quantity' => 100,
            'max_quantity' => 10000,
            'sell_price_per_1000' => 100000,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $provider = SocialProvider::create([
            'name' => 'VietnamFB V2 Test',
            'slug' => 'vietnamfb-v2-submit-test',
            'driver' => 'vietnamfb_v2',
            'api_url' => 'https://provider.example/api/v2',
            'api_key' => 'fake-test-key',
            'status' => 'active',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        $mapping = SocialProviderService::create([
            'social_provider_id' => $provider->id,
            'social_service_id' => $service->id,
            'provider_service_id' => '12',
            'provider_service_name' => 'Test V2 Service',
            'cost_price_per_1000' => 2.5,
            'min_quantity' => 100,
            'max_quantity' => 10000,
            'is_active' => true,
        ]);

        return SocialOrder::create([
            'code' => 'TEST-V2-ORDER',
            'user_id' => $user->id,
            'social_service_id' => $service->id,
            'social_provider_id' => $provider->id,
            'social_provider_service_id' => $mapping->id,
            'target' => 'https://example.com/profile',
            'quantity' => 200,
            'sell_amount' => 20000,
            'cost_amount' => 500,
            'profit_amount' => 19500,
            'status' => 'pending',
            'attempts' => 0,
            'refunded_amount' => 0,
        ]);
    }

    public function test_submit_saves_provider_id_and_prevents_duplicate(): void
    {
        Http::fake([
            '*' => Http::response(['order' => 987654]),
        ]);

        $order = $this->makeOrder();

        $result = app(SocialOrderProviderService::class)
            ->submit($order);

        $this->assertSame('processing', $result->fresh()->status);
        $this->assertSame('987654', $result->fresh()->provider_order_id);
        $this->assertSame(1, (int) $result->fresh()->attempts);

        app(SocialOrderProviderService::class)
            ->submit($order->fresh());

        Http::assertSentCount(1);
    }

    public function test_timeout_does_not_resubmit_or_refund(): void
    {
        $calls = 0;

        Http::fake(function () use (&$calls) {
            $calls++;
            throw new ConnectionException('Simulated timeout');
        });

        $order = $this->makeOrder();

        try {
            app(SocialOrderProviderService::class)->submit($order);
        } catch (\Throwable $e) {
            // Kết quả provider chưa rõ, không được tự gửi lại.
        }

        $fresh = $order->fresh();

        $this->assertSame(1, (int) $fresh->attempts);
        $this->assertNull($fresh->provider_order_id);
        $this->assertEquals(0, (float) $fresh->refunded_amount);

        try {
            app(SocialOrderProviderService::class)->submit($fresh);
            $this->fail('Duplicate submission was allowed.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString(
                'số lần thử',
                $e->getMessage()
            );
        }

        $this->assertSame(1, $calls);
    }
}
