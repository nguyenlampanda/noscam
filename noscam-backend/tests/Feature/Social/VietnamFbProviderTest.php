<?php

namespace Tests\Feature\Social;

use App\Services\Social\Providers\VietnamFbProvider;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VietnamFbProviderTest extends TestCase
{
    public function test_facebook_follow_uses_correct_route(): void
    {
        Http::fake([
            '*' => Http::response([
                'success' => 1,
                'order_id' => '12345',
            ], 200),
        ]);

        $provider = new VietnamFbProvider(
            'https://example.com/api',
            'test-key',
            'test-user'
        );

        $result = $provider->createOrder(
            'BUFF_SUB:33',
            '100000000',
            100
        );

        $this->assertSame('12345', $result['order_id']);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'mc=buff_sub')
                && str_contains($request->url(), 'site=create')
                && $request['channel_number'] === '33'
                && $request['amount'] === 100;
        });
    }

    public function test_instagram_like_uses_correct_route(): void
    {
        Http::fake([
            '*' => Http::response([
                'success' => 1,
                'order_id' => '12346',
            ], 200),
        ]);

        $provider = new VietnamFbProvider(
            'https://example.com/api',
            'test-key',
            'test-user'
        );

        $provider->createOrder(
            'INSTAGRAM_LIKE:2',
            '123456789',
            100
        );

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'mc=instagram_like')
                && $request['channel_number'] === '2';
        });
    }

    public function test_missing_required_option_never_sends_request(): void
    {
        Http::fake();

        $provider = new VietnamFbProvider(
            'https://example.com/api',
            'test-key'
        );

        try {
            $provider->createOrder(
                'BUFF_LIVE:1',
                '123456789',
                100
            );

            $this->fail('Expected validation exception.');
        } catch (\App\Services\Social\ProviderOrderRejectedException $e) {
            $this->assertStringContainsString(
                'mins',
                $e->getMessage()
            );
        }

        Http::assertNothingSent();
    }

    public function test_provider_rejection_requires_reconciliation(): void
    {
        Http::fake([
            '*' => Http::response([
                'success' => 0,
                'message' => 'Service unavailable',
            ], 200),
        ]);

        $provider = new VietnamFbProvider(
            'https://example.com/api',
            'test-key'
        );

        $this->expectException(\RuntimeException::class);

        $provider->createOrder(
            'BUFF_SUB:33',
            '100000000',
            100
        );
    }

    public function test_panel_min_max_quantity_mapping(): void
    {
        \Illuminate\Support\Facades\Http::fake([
            '*' => \Illuminate\Support\Facades\Http::response([
                'PANEL' => [
                    [
                        'id' => 123,
                        'name' => 'Test PANEL',
                        'price' => 100,
                        'min_quantity' => 50,
                        'max_quantity' => 5000,
                    ],
                ],
            ]),
        ]);

        $provider = new \App\Services\Social\Providers\VietnamFbProvider(
            'https://example.com/api',
            'test-key',
            'test-user'
        );

        $services = $provider->services();

        $this->assertCount(1, $services);
        $this->assertSame('PANEL:123', $services[0]['service']);
        $this->assertSame(50, $services[0]['min']);
        $this->assertSame(5000, $services[0]['max']);
        $this->assertTrue($services[0]['min_verified']);
        $this->assertTrue($services[0]['max_verified']);
    }

}
