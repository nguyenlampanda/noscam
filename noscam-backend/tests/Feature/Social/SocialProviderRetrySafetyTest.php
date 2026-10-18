<?php

namespace Tests\Feature\Social;

use App\Services\Social\Providers\StandardSmmProvider;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocialProviderRetrySafetyTest extends TestCase
{
    public function test_create_order_does_not_retry_after_timeout(): void
    {
        $calls = 0;

        Http::fake(function () use (&$calls) {
            $calls++;
            throw new ConnectionException('Simulated timeout');
        });

        $provider = new StandardSmmProvider(
            'https://provider.example/api',
            'test-api-key'
        );

        try {
            $provider->createOrder(
                '123',
                'https://example.com/profile',
                100
            );

            $this->fail('Expected connection exception.');
        } catch (ConnectionException $e) {
            $this->assertSame(
                'Simulated timeout',
                $e->getMessage()
            );
        }

        $this->assertSame(1, $calls);
    }

    public function test_vip_order_does_not_retry_after_timeout(): void
    {
        $calls = 0;

        Http::fake(function () use (&$calls) {
            $calls++;
            throw new ConnectionException('Simulated timeout');
        });

        $provider = new StandardSmmProvider(
            'https://provider.example/api',
            'test-api-key'
        );

        try {
            $provider->createVipOrder(
                '123',
                'https://example.com/profile',
                100,
                30
            );

            $this->fail('Expected connection exception.');
        } catch (ConnectionException $e) {
            $this->assertSame(
                'Simulated timeout',
                $e->getMessage()
            );
        }

        $this->assertSame(1, $calls);
    }
}
