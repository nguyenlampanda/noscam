<?php

namespace Tests\Feature\Social;

use App\Models\SocialProvider;
use App\Services\Social\SocialProviderInterface;
use App\Services\Social\SocialProviderManager;
use App\Services\Social\ProviderWalletBalanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class ProviderWalletBalanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_shared_wallet_and_failed_refresh(): void
    {
        Http::preventStrayRequests();

        $create = function ($driver, $currency, $rate, $status = 'active') {
            return SocialProvider::create([
                'name' => $driver,
                'slug' => $driver,
                'driver' => $driver,
                'api_url' => 'https://example.invalid/api',
                'api_key' => 'fake-test-key',
                'status' => $status,
                'currency' => $currency,
                'exchange_rate_to_vnd' => $rate,
                'balance' => 100,
            ]);
        };

        $legacy = $create('vietnamfb', 'VND', 1);
        $v2 = $create('vietnamfb_v2', 'USD', 1);
        $hack = $create('hacklike17', 'USD', 27500);
        $sub = $create('subs24h', 'USD', 27500);
        $bln = $create('bufflikenhanh_v2', 'VND', 1);
        $inactive = $create('nganhangsub', 'VND', 1, 'inactive');

        $manager = Mockery::mock(SocialProviderManager::class);

        $responses = [
            [$legacy, ['success' => true, 'balance' => '41257']],
            [$hack, ['balance' => '0.73338', 'currency' => 'USD']],
            [$sub, ['balance' => '1.543692', 'currency' => 'USD']],
            [$bln, ['balance' => '19499.9', 'currency' => 'VND']],
        ];

        foreach ($responses as [$provider, $response]) {
            $api = Mockery::mock(SocialProviderInterface::class);

            $api->shouldReceive('balance')
                ->once()
                ->andReturn($response);

            $api->shouldReceive('balance')
                ->once()
                ->andThrow(new \RuntimeException('Test API error'));

            $manager->shouldReceive('make')
                ->with(Mockery::on(
                    fn ($p) => $p->id === $provider->id
                ))
                ->twice()
                ->andReturn($api);
        }

        $service = new ProviderWalletBalanceService($manager);

        $results = $service->sync();

        $this->assertCount(4, $results);

        $this->assertEquals(
            41257,
            $legacy->fresh()->wallet_balance_vnd
        );

        $this->assertEquals(
            41257,
            $v2->fresh()->wallet_balance_vnd
        );

        $this->assertEquals(
            'vietnamfb',
            $v2->fresh()->wallet_group
        );

        $this->assertEqualsWithDelta(
            20167.95,
            (float) $hack->fresh()->wallet_balance_vnd,
            0.01
        );

        $this->assertEqualsWithDelta(
            42451.53,
            (float) $sub->fresh()->wallet_balance_vnd,
            0.01
        );

        $this->assertEquals(
            19499.9,
            $bln->fresh()->wallet_balance_vnd
        );

        $this->assertNull(
            $inactive->fresh()->wallet_balance_vnd
        );

        $this->assertEquals(
            1,
            $v2->fresh()->exchange_rate_to_vnd
        );

        $this->assertEquals(
            'USD',
            $v2->fresh()->currency
        );

        $checkedAt = $legacy->fresh()->wallet_checked_at;

        $service->sync();

        $this->assertEquals(
            41257,
            $legacy->fresh()->wallet_balance_vnd
        );

        $this->assertEquals(
            $checkedAt,
            $legacy->fresh()->wallet_checked_at
        );

        $this->assertNotNull(
            $legacy->fresh()->wallet_error
        );

        $this->assertEquals(
            'active',
            $legacy->fresh()->status
        );

        Http::assertNothingSent();
    }

    public function test_manual_v2_refresh_uses_shared_wallet(): void
    {
        Http::preventStrayRequests();

        $create = function ($driver, $currency) {
            return SocialProvider::create([
                'name' => $driver,
                'slug' => $driver,
                'driver' => $driver,
                'api_url' => 'https://example.invalid/api',
                'api_key' => 'fake-test-key',
                'status' => 'active',
                'currency' => $currency,
                'exchange_rate_to_vnd' => 1,
                'balance' => 100,
            ]);
        };

        $legacy = $create('vietnamfb', 'VND');
        $v2 = $create('vietnamfb_v2', 'USD');
        $bln = $create('bufflikenhanh_v2', 'VND');

        $api = Mockery::mock(SocialProviderInterface::class);

        $api->shouldReceive('balance')
            ->once()
            ->andReturn([
                'success' => true,
                'balance' => '41257',
            ]);

        $manager = Mockery::mock(SocialProviderManager::class);

        $manager->shouldReceive('make')
            ->with(Mockery::on(
                fn ($p) => $p->id === $legacy->id
            ))
            ->once()
            ->andReturn($api);

        $service = new ProviderWalletBalanceService($manager);

        $controller = new \App\Http\Controllers\Api\AdminSocialProviderController();

        $response = $controller->refreshBalance($v2, $service);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals(41257, $response->getData(true)['data']['balance_vnd']);
        $this->assertEquals(41257, $legacy->fresh()->wallet_balance_vnd);
        $this->assertEquals(41257, $v2->fresh()->wallet_balance_vnd);
        $this->assertNull($bln->fresh()->wallet_balance_vnd);
        $this->assertEquals('USD', $v2->fresh()->currency);
        $this->assertEquals(1, $v2->fresh()->exchange_rate_to_vnd);

        Http::assertNothingSent();
    }

}
