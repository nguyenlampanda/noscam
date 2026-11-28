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
}
