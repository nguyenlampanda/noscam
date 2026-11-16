<?php

namespace Tests\Feature\Social;

use App\Services\Social\Providers\HackLike17Provider;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HackLike17TikTokUrlTest extends TestCase
{
    public function test_full_tiktok_url_is_sent_without_change(): void
    {
        Http::fake([
            'hacklike17.com/*' => Http::response([
                'order' => 123456,
            ]),
        ]);

        $provider = new HackLike17Provider(
            'https://hacklike17.com/api/v2',
            'test-key'
        );

        $provider->createOrder(
            '58',
            'https://www.tiktok.com/@hab.0_0/video/7687903064543481108',
            1000
        );

        Http::assertSentCount(1);

        Http::assertSent(function ($request) {
            return $request['action'] === 'add'
                && $request['service'] === '58'
                && $request['quantity'] == 1000
                && $request['link'] ===
                    'https://www.tiktok.com/@hab.0_0/video/7687903064543481108';
        });
    }

    public function test_other_provider_urls_are_unchanged(): void
    {
        Http::fake([
            '*' => Http::response(['order' => 456]),
        ]);

        $provider = new HackLike17Provider(
            'https://hacklike17.com/api/v2',
            'test-key'
        );

        $provider->createOrder(
            '10',
            'https://www.instagram.com/example/',
            100
        );

        Http::assertSentCount(1);

        Http::assertSent(fn ($request) =>
            $request['link'] ===
            'https://www.instagram.com/example/'
        );
    }

    public function test_short_tiktok_url_resolves_before_submission(): void
    {
        Http::fake([
            'vt.tiktok.com/*' => Http::response(
                '',
                302,
                [
                    'Location' =>
                        'https://www.tiktok.com/@hab.0_0/video/7687903064543481108?_r=1',
                ]
            ),
            'hacklike17.com/*' => Http::response([
                'order' => 987654,
            ]),
        ]);

        $provider = new HackLike17Provider(
            'https://hacklike17.com/api/v2',
            'test-key'
        );

        $response = $provider->createOrder(
            '58',
            'https://vt.tiktok.com/ZSpqBsfCh/',
            1000
        );

        $this->assertSame(987654, $response['order']);

        Http::assertSentCount(2);

        Http::assertSent(fn ($request) =>
            str_contains($request->url(), 'hacklike17.com')
            && $request['link'] ===
                'https://www.tiktok.com/@hab.0_0/video/7687903064543481108'
        );
    }

    public function test_multiple_tiktok_redirects_are_resolved(): void
    {
        Http::fake([
            'vt.tiktok.com/*' => Http::response(
                '',
                302,
                ['Location' => 'https://www.tiktok.com/redirect-step']
            ),
            'www.tiktok.com/redirect-step' => Http::response(
                '',
                302,
                [
                    'Location' =>
                        'https://www.tiktok.com/@hab.0_0/video/7687903064543481108?share=1'
                ]
            ),
            'hacklike17.com/*' => Http::response([
                'order' => 888888,
            ]),
        ]);

        $provider = new HackLike17Provider(
            'https://hacklike17.com/api/v2',
            'test-key'
        );

        $result = $provider->createOrder(
            '58',
            'https://vt.tiktok.com/ZSpqBsfCh/',
            1000
        );

        $this->assertSame(888888, $result['order']);

        Http::assertSentCount(3);

        Http::assertSent(fn ($request) =>
            str_contains($request->url(), 'hacklike17.com')
            && $request['link'] ===
                'https://www.tiktok.com/@hab.0_0/video/7687903064543481108'
        );
    }

    public function test_redirect_to_localhost_is_blocked(): void
    {
        Http::fake([
            'vt.tiktok.com/*' => Http::response(
                '',
                302,
                ['Location' => 'http://127.0.0.1:8080/private']
            ),
            '*' => Http::response(['order' => 999999]),
        ]);

        $provider = new HackLike17Provider(
            'https://hacklike17.com/api/v2',
            'test-key'
        );

        try {
            $provider->createOrder(
                '58',
                'https://vt.tiktok.com/ZSpqBsfCh/',
                1000
            );

            $this->fail('Expected unsafe redirect rejection.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString(
                'TikTok redirect không hợp lệ',
                $e->getMessage()
            );
        }

        Http::assertSentCount(1);
    }

    public function test_invalid_tiktok_redirect_does_not_submit_order(): void
    {
        Http::fake([
            'vt.tiktok.com/*' => Http::response(
                '',
                302,
                [
                    'Location' =>
                        'https://example.com/not-a-video',
                ]
            ),
            'hacklike17.com/*' => Http::response([
                'order' => 789,
            ]),
        ]);

        $provider = new HackLike17Provider(
            'https://hacklike17.com/api/v2',
            'test-key'
        );

        try {
            $provider->createOrder(
                '58',
                'https://vt.tiktok.com/abc/',
                1000
            );

            $this->fail('Expected invalid redirect error.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString(
                'TikTok redirect không hợp lệ.',
                $e->getMessage()
            );
        }

        Http::assertSentCount(1);

        Http::assertNotSent(fn ($request) =>
            str_contains($request->url(), 'hacklike17.com')
        );

        Http::assertNotSent(fn ($request) =>
            str_contains($request->url(), 'example.com')
        );
    }
}
