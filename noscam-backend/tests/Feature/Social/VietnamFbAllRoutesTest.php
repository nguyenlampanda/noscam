<?php

namespace Tests\Feature\Social;

use App\Services\Social\Providers\VietnamFbProvider;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VietnamFbAllRoutesTest extends TestCase
{
    public function test_all_21_routes_send_correct_module(): void
    {
        $routes = [
            'BUFF_LIKE' => 'buff',
            'BUFF_COMMENT' => 'buff_comment',
            'BUFF_SUB' => 'buff_sub',
            'BUFF_LIVE' => 'buff_live',
            'BUFF_VIEW_NEW' => 'buff_view_new',
            'BUFF_REEL' => 'buff_reel',
            'LIKE_PAGE2' => 'like_page2',
            'LIKEPAGE_2' => 'like_page2',
            'SHARE_LIVE' => 'sharelive',
            'FANPAGE_REVIEW' => 'fanpage_review',
            'STORY_VIEW' => 'story_view',
            'SHARELIVE' => 'sharelive',
            'VIPLIKE' => 'viplike',
            'VIPCMT' => 'vipcmt',
            'VIPMAT' => 'vipmat',
            'VIPSHARELIVE' => 'vipsharelive',
            'INSTAGRAM_SUB' => 'instagram',
            'INSTAGRAM_LIKE' => 'instagram_like',
            'INSTAGRAM_COMMENT' => 'instagram_comment',
            'TIKTOK_SUB' => 'tiktok_sub',
            'PANEL' => 'panel',
            'COVID_LIKEPOST' => 'covid_likepost',
            'COVID_LIKEPOST4' => 'covid_likepost4',
        ];

        foreach ($routes as $group => $expectedMc) {
            Http::fake([
                '*' => Http::response([
                    'success' => 1,
                    'order_id' => '12345',
                ]),
            ]);

            $provider = new VietnamFbProvider(
                'https://example.com/api',
                'test-key'
            );

            $options = [
                'comments' => "Binh luan 1\nBinh luan 2",
                'payload' => [
                    'mins' => 30,
                    'service_id' => 1,
                    'package' => 1,
                    'time' => 30,
                    'post_per_day' => 1,
                    'reaction' => 'LIKE',
                    'content' => 'Test comment',
                    'max_order_per_day' => 1,
                    'max_time_per_order' => 30,
                    'quantity' => 2,
                    'totalshare' => 2,
                    'package_type' => 1,
                ],
            ];

            $provider->createOrder(
                $group.':1',
                '123456789',
                2,
                $options
            );

            Http::assertSent(function ($request) use ($expectedMc) {
                parse_str(
                    parse_url($request->url(), PHP_URL_QUERY) ?? '',
                    $query
                );

                return ($query['mc'] ?? null) === $expectedMc
                    && ($query['site'] ?? null) !== null;
            });

            Http::assertSentCount(1);
        }
    }
}
