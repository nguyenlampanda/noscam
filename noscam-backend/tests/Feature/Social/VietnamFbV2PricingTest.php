<?php

namespace Tests\Feature\Social;

use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VietnamFbV2PricingTest extends TestCase
{
    #[Test]
    public function v2_cost_is_already_vnd_per_thousand(): void
    {
        $provider = new SocialProvider([
            'driver' => 'vietnamfb_v2',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        $service = new SocialProviderService([
            'cost_price_per_1000' => 38518.48,
        ]);

        $service->setRelation('provider', $provider);

        $this->assertEqualsWithDelta(
            38518.48,
            $service->costPriceVnd(),
            0.001
        );

        $this->assertEqualsWithDelta(
            3851.848,
            $service->costPriceVnd() * 100 / 1000,
            0.001
        );
    }

    #[Test]
    public function legacy_cost_conversion_is_unchanged(): void
    {
        $provider = new SocialProvider([
            'driver' => 'vietnamfb',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        $service = new SocialProviderService([
            'cost_price_per_1000' => 38.5185,
        ]);

        $service->setRelation('provider', $provider);

        $this->assertEqualsWithDelta(
            38518.50,
            $service->costPriceVnd() * 1000,
            0.001
        );
    }
}
