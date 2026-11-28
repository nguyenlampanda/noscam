<?php

namespace Tests\Feature\Social;

use App\Models\SocialOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProviderBalanceSnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_snapshot_is_independent_of_live_balance(): void
    {
        Http::preventStrayRequests();

        $order = new SocialOrder([
            'provider_balance_snapshot_vnd' => 19499.9,
            'provider_balance_snapshot_at' => now(),
        ]);

        $order->setRelation('provider', new \App\Models\SocialProvider([
            'balance' => 13979.9,
        ]));

        $this->assertEquals(
            19499.9,
            (float) $order->provider_balance_snapshot_vnd
        );

        $order->provider->balance = 9220;

        $this->assertEquals(
            19499.9,
            (float) $order->provider_balance_snapshot_vnd
        );

        $this->assertArrayNotHasKey(
            'provider_balance_snapshot_vnd',
            $order->toArray()
        );

        $this->assertArrayNotHasKey(
            'provider_balance_snapshot_at',
            $order->toArray()
        );

        $order->makeVisible([
            'provider_balance_snapshot_vnd',
            'provider_balance_snapshot_at',
        ]);

        $this->assertEquals(
            19499.9,
            (float) $order->toArray()['provider_balance_snapshot_vnd']
        );

        Http::assertNothingSent();
    }

    public function test_new_orders_capture_latest_wallet_snapshot(): void
    {
        Http::preventStrayRequests();

        $provider = \App\Models\SocialProvider::create([
            'name' => 'Snapshot Test',
            'slug' => 'snapshot-test',
            'driver' => 'bufflikenhanh_v2',
            'api_url' => 'https://example.invalid/api',
            'api_key' => 'fake-test-key',
            'status' => 'active',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
        ]);

        $api = \Mockery::mock(
            \App\Services\Social\SocialProviderInterface::class
        );

        $api->shouldReceive('balance')
            ->times(3)
            ->andReturn(
                ['balance' => 19500, 'currency' => 'VND'],
                ['balance' => 13980, 'currency' => 'VND'],
                ['balance' => 9220, 'currency' => 'VND']
            );

        $manager = \Mockery::mock(
            \App\Services\Social\SocialProviderManager::class
        );

        $manager->shouldReceive('make')
            ->times(3)
            ->andReturn($api);

        $sync = new \App\Services\Social\ProviderWalletBalanceService(
            $manager
        );

        $sync->sync();

        $this->assertEquals(
            19500,
            $provider->fresh()->wallet_balance_vnd
        );

        $firstSnapshot = $provider->fresh()->wallet_balance_vnd;
        $firstCheckedAt = $provider->fresh()->wallet_checked_at;

        $sync->sync();

        $this->assertEquals(
            13980,
            $provider->fresh()->wallet_balance_vnd
        );

        $secondSnapshot = $provider->fresh()->wallet_balance_vnd;

        $sync->sync();

        $this->assertEquals(
            9220,
            $provider->fresh()->wallet_balance_vnd
        );

        $this->assertEquals(19500, $firstSnapshot);
        $this->assertEquals(13980, $secondSnapshot);
        $this->assertNotNull($firstCheckedAt);

        Http::assertNothingSent();
    }

}
