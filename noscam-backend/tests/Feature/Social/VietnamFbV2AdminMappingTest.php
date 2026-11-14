<?php

namespace Tests\Feature\Social;

use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use App\Models\SocialService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VietnamFbV2AdminMappingTest extends TestCase
{
    use RefreshDatabase;

    private function makeData(
        float $sellPrice = 5000,
        int $min = 10,
        int $max = 1000,
        array $limits = ['min' => 10, 'max' => 1000]
    ): array {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $provider = SocialProvider::create([
            'name' => 'VietnamFB V2 Test',
            'slug' => 'vietnamfb-v2-test',
            'driver' => 'vietnamfb_v2',
            'api_url' => 'https://example.com/api/v2',
            'status' => 'active',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        $providerService = SocialProviderService::create([
            'social_provider_id' => $provider->id,
            'provider_service_id' => 'TEST-V2-001',
            'provider_service_name' => 'Instagram Followers Test',
            'cost_price_per_1000' => 3000,
            'min_quantity' => 10,
            'max_quantity' => 1000,
            'provider_data' => $limits,
            'is_active' => true,
        ]);

        $service = SocialService::create([
            'code' => 'TEST-V2-MAPPING',
            'platform' => 'instagram',
            'category' => 'followers',
            'name' => 'Instagram Followers Test',
            'sell_price_per_1000' => $sellPrice,
            'min_quantity' => $min,
            'max_quantity' => $max,
            'is_active' => true,
        ]);

        return [$providerService, $service];
    }

    private function map(
        SocialProviderService $providerService,
        SocialService $service,
        ?bool $confirmed = true
    ) {
        $payload = [
            'social_service_id' => $service->id,
        ];

        if ($confirmed !== null) {
            $payload['v2_mapping_confirmed'] = $confirmed;
        }

        return $this->postJson(
            "/api/admin/social/provider-services/{$providerService->id}/map",
            $payload
        );
    }

    public function test_rejects_mapping_without_confirmation(): void
    {
        [$source, $target] = $this->makeData();

        $this->map($source, $target, null)
            ->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

    public function test_rejects_mapping_with_false_confirmation(): void
    {
        [$source, $target] = $this->makeData();

        $this->map($source, $target, false)
            ->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

    public function test_rejects_price_not_above_cost(): void
    {
        [$source, $target] = $this->makeData(
            sellPrice: 2000
        );

        $this->map($source, $target)->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

    public function test_rejects_quantity_outside_provider_limits(): void
    {
        [$source, $target] = $this->makeData(
            max: 2000
        );

        $this->map($source, $target)->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

    public function test_rejects_missing_provider_limits(): void
    {
        [$source, $target] = $this->makeData(
            limits: []
        );

        $this->map($source, $target)->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

    public function test_maps_valid_existing_service(): void
    {
        [$source, $target] = $this->makeData();

        $this->map($source, $target)->assertOk();

        $this->assertSame(
            $target->id,
            $source->fresh()->social_service_id
        );

        $this->assertEquals(
            5000,
            $target->fresh()->sell_price_per_1000
        );
    }

    private function createNewV2Service(
        SocialProviderService $source,
        array $overrides = []
    ) {
        return $this->postJson(
            "/api/admin/social/provider-services/{$source->id}/map",
            array_replace([
                'platform' => 'instagram',
                'category' => 'follow',
                'name' => 'Instagram Followers V2',
                'sell_price_per_1000' => 5000,
                'min_quantity' => 10,
                'max_quantity' => 1000,
                'v2_mapping_confirmed' => true,
            ], $overrides)
        );
    }

    public function test_creates_new_v2_service_with_confirmation(): void
    {
        [$source] = $this->makeData();

        $response = $this->createNewV2Service($source)
            ->assertOk();

        $service = SocialService::findOrFail(
            $response->json('data.id')
        );

        $this->assertSame(
            $service->id,
            $source->fresh()->social_service_id
        );
        $this->assertSame('instagram', $service->platform);
        $this->assertSame('follow', $service->category);
        $this->assertEquals(5000, $service->sell_price_per_1000);
        $this->assertSame(10, (int) $service->min_quantity);
        $this->assertSame(1000, (int) $service->max_quantity);
    }

    public function test_rejects_new_v2_service_without_confirmation(): void
    {
        [$source] = $this->makeData();

        $this->createNewV2Service($source, [
            'v2_mapping_confirmed' => false,
        ])->assertStatus(422);

        $this->assertNull($source->fresh()->social_service_id);
    }

    public function test_rejects_new_v2_service_below_cost(): void
    {
        [$source] = $this->makeData();

        $this->createNewV2Service($source, [
            'sell_price_per_1000' => 2000,
        ])->assertStatus(422);

        $this->assertNull($source->fresh()->social_service_id);
    }

    public function test_rejects_new_v2_service_outside_limits(): void
    {
        [$source] = $this->makeData();

        $this->createNewV2Service($source, [
            'max_quantity' => 2000,
        ])->assertStatus(422);

        $this->assertNull($source->fresh()->social_service_id);
    }

}
