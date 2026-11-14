<?php

namespace Tests\Feature\Social;

use App\Services\Social\Providers\VietnamFbV2Provider;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class VietnamFbV2ProviderTest extends TestCase
{
    private function provider(): VietnamFbV2Provider
    {
        return new VietnamFbV2Provider(
            'https://vietnamfb.com/api/v2',
            'fake-test-key'
        );
    }

    public function test_services_and_balance(): void
    {
        Http::fake([
            '*' => Http::sequence()
                ->push([
                    [
                        'service' => 12,
                        'name' => 'Test Service',
                        'rate' => '2.5',
                        'min' => '100',
                        'max' => '10000',
                    ],
                ])
                ->push([
                    'balance' => '100000',
                    'currency' => 'VND',
                ]),
        ]);

        $services = $this->provider()->services();
        $balance = $this->provider()->balance();

        $this->assertSame(12, $services[0]['service']);
        $this->assertSame('2.5', $services[0]['rate']);
        $this->assertSame('VND', $balance['currency']);

        Http::assertSentCount(2);
    }

    public function test_create_order_uses_correct_fields(): void
    {
        Http::fake([
            '*' => Http::response(['order' => 9999]),
        ]);

        $result = $this->provider()->createOrder(
            '12',
            'https://example.com/post',
            200
        );

        $this->assertSame(9999, $result['order']);

        Http::assertSent(function ($request) {
            return $request['action'] === 'add'
                && $request['service'] === '12'
                && $request['quantity'] === 200
                && $request['key'] === 'fake-test-key';
        });
    }

    public function test_options_cannot_override_order_fields(): void
    {
        Http::fake();

        $this->expectException(RuntimeException::class);

        try {
            $this->provider()->createOrder(
                '12',
                'https://example.com',
                200,
                ['quantity' => 999999]
            );
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_cancel_uses_orders_plural(): void
    {
        Http::fake([
            '*' => Http::response([
                [
                    'order' => 9999,
                    'cancel' => 1,
                ],
            ]),
        ]);

        $this->provider()->cancel('9999');

        Http::assertSent(function ($request) {
            return $request['action'] === 'cancel'
                && (string) $request['orders'] === '9999'
                && !isset($request['order']);
        });
    }

    public function test_cancel_rejection_throws_exception(): void
    {
        Http::fake([
            '*' => Http::response([
                [
                    'order' => 9999,
                    'cancel' => [
                        'error' => 'Incorrect order ID',
                    ],
                ],
            ]),
        ]);

        $this->expectException(RuntimeException::class);

        $this->provider()->cancel('9999');
    }


    public function test_cancel_accepts_string_success(): void
    {
        Http::fake([
            '*' => Http::response([
                [
                    'order' => '9999',
                    'cancel' => '1',
                ],
            ]),
        ]);

        $result = $this->provider()->cancel('9999');

        $this->assertSame('1', $result[0]['cancel']);
        Http::assertSentCount(1);
    }

    public function test_cancel_timeout_does_not_retry(): void
    {
        $attempts = 0;

        Http::fake(function () use (&$attempts) {
            $attempts++;

            throw new \Illuminate\Http\Client\ConnectionException(
                'Simulated timeout'
            );
        });

        try {
            $this->provider()->cancel('9999');
            $this->fail('Expected connection exception.');
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            $this->assertSame(
                'Simulated timeout',
                $e->getMessage()
            );
        }

        $this->assertSame(
            1,
            $attempts,
            'Cancel V2 must not retry after timeout.'
        );
    }

    public function test_order_status(): void
    {
        Http::fake([
            '*' => Http::response([
                'status' => 'Completed',
                'remains' => '0',
            ]),
        ]);

        $result = $this->provider()->orderStatus('9999');

        $this->assertSame('Completed', $result['status']);

        Http::assertSent(function ($request) {
            return $request['action'] === 'status'
                && (string) $request['order'] === '9999';
        });
    }
}
