<?php

namespace App\Services\Social;

use App\Models\SocialProvider;
use App\Services\Social\Providers\HackLike17Provider;
use App\Services\Social\Providers\NganHangSubProvider;
use App\Services\Social\Providers\VietnamFbProvider;
use InvalidArgumentException;

class SocialProviderManager
{
    public function make(
        SocialProvider $provider
    ): SocialProviderInterface {
        return match ($provider->driver) {
            'nganhangsub' =>
                new NganHangSubProvider(
                    $provider->api_url,
                    $provider->api_key
                ),

            'hacklike17' =>
                new HackLike17Provider(
                    $provider->api_url,
                    $provider->api_key
                ),

            'vietnamfb' =>
                new VietnamFbProvider(
                    $provider->api_url,
                    $provider->api_key,
                    data_get(
                        $provider->settings,
                        'username'
                    )
                ),

            default =>
                throw new InvalidArgumentException(
                    'Provider driver không hỗ trợ: '
                    .$provider->driver
                ),
        };
    }
}
