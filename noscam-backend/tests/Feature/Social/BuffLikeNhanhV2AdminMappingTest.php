<?php

namespace Tests\Feature\Social;

use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use App\Models\SocialService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BuffLikeNhanhV2AdminMappingTest extends TestCase
{
    use RefreshDatabase;

    private function makeData(
        float $sellPrice = 60000,
        int $min = 50,
        int $max = 100000
    ): array {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $provider = SocialProvider::create([
            'name' => 'BuffLikeNhanh Test',
            'slug' => 'bufflikenhanh-mapping-test',
            'driver' => 'bufflikenhanh_v2',
            'api_url' => 'https://example.com/api/v2',
            'status' => 'inactive',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        $source = SocialProviderService::create([
            'social_provider_id' => $provider->id,
            'provider_service_id' => '64500',
            'provider_service_name' => 'Instagram Follow',
            'cost_price_per_1000' => 49000,
            'min_quantity' => 50,
            'max_quantity' => 100000,
            'is_active' => false,
        ]);

        $target = SocialService::create([
            'code' => 'TEST-BLN-MAP',
            'platform' => 'instagram',
            'category' => 'followers',
            'name' => 'Instagram Followers',
            'sell_price_per_1000' => $sellPrice,
            'min_quantity' => $min,
            'max_quantity' => $max,
            'is_active' => true,
        ]);

        return [$source, $target];
    }

    private function mapExisting(
        SocialProviderService $source,
        SocialService $target
    ) {
        return $this->postJson(
            "/api/admin/social/provider-services/{$source->id}/map",
            ['social_service_id' => $target->id]
        );
    }

    public function test_rejects_existing_service_below_cost(): void
    {
        [$source, $target] = $this->makeData(
            sellPrice: 40000
        );

        $this->mapExisting($source, $target)
            ->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

    public function test_rejects_existing_service_outside_limits(): void
    {
        [$source, $target] = $this->makeData(
            min: 10
        );

        $this->mapExisting($source, $target)
            ->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

    public function test_maps_valid_service_but_keeps_source_inactive(): void
    {
        [$source, $target] = $this->makeData();

        $this->mapExisting($source, $target)
            ->assertOk();

        $this->assertSame(
            $target->id,
            $source->fresh()->social_service_id
        );

        $this->assertFalse(
            (bool) $source->fresh()->is_active
        );
    }

    public function test_creates_new_service_inactive(): void
    {
        [$source] = $this->makeData();

        $response = $this->postJson(
            "/api/admin/social/provider-services/{$source->id}/map",
            [
                'platform' => 'instagram',
                'category' => 'followers',
                'name' => 'BuffLikeNhanh New Test',
                'sell_price_per_1000' => 60000,
                'min_quantity' => 50,
                'max_quantity' => 100000,
            ]
        )->assertOk();

        $service = SocialService::findOrFail(
            $response->json('data.id')
        );

        $this->assertFalse(
            (bool) $service->is_active
        );

        $this->assertFalse(
            (bool) $source->fresh()->is_active
        );
    }

    public function test_allows_valid_mapped_source_activation(): void
    {
        [$source, $target] = $this->makeData();

        $source->update([
            'social_service_id' => $target->id,
            'provider_availability' => 'available',
        ]);

        $this->patchJson(
            "/api/admin/social/provider-services/{$source->id}",
            ['is_active' => true]
        )->assertOk();

        $this->assertTrue((bool) $source->fresh()->is_active);
        $this->assertSame('inactive', $source->provider->fresh()->status);

        $this->patchJson(
            "/api/admin/social/provider-services/{$source->id}",
            ['is_active' => false]
        )->assertOk();

        $this->assertFalse((bool) $source->fresh()->is_active);
    }

    public function test_rejects_unavailable_source_activation(): void
    {
        [$source, $target] = $this->makeData();

        $source->update([
            'social_service_id' => $target->id,
            'provider_availability' => 'unavailable',
        ]);

        $this->patchJson(
            "/api/admin/social/provider-services/{$source->id}",
            ['is_active' => true]
        )->assertStatus(422);

        $this->assertFalse((bool) $source->fresh()->is_active);
    }

    public function test_rejects_below_cost_source_activation(): void
    {
        [$source, $target] = $this->makeData(sellPrice: 40000);

        $source->update([
            'social_service_id' => $target->id,
            'provider_availability' => 'available',
        ]);

        $this->patchJson(
            "/api/admin/social/provider-services/{$source->id}",
            ['is_active' => true]
        )->assertStatus(422);

        $this->assertFalse((bool) $source->fresh()->is_active);
    }

    public function test_rejects_manual_activation(): void
    {
        [$source] = $this->makeData();

        $this->patchJson(
            "/api/admin/social/provider-services/{$source->id}",
            ['is_active' => true]
        )->assertStatus(422);

        $this->assertFalse(
            (bool) $source->fresh()->is_active
        );
    }

    public function test_rejects_new_service_below_provider_minimum(): void
    {
        [$source] = $this->makeData();

        $this->postJson(
            "/api/admin/social/provider-services/{$source->id}/map",
            [
                'platform' => 'instagram',
                'category' => 'followers',
                'name' => 'Invalid Minimum Test',
                'sell_price_per_1000' => 60000,
                'min_quantity' => 10,
                'max_quantity' => 100000,
            ]
        )->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

    public function test_rejects_new_service_above_provider_maximum(): void
    {
        [$source] = $this->makeData();

        $this->postJson(
            "/api/admin/social/provider-services/{$source->id}/map",
            [
                'platform' => 'instagram',
                'category' => 'followers',
                'name' => 'Invalid Maximum Test',
                'sell_price_per_1000' => 60000,
                'min_quantity' => 50,
                'max_quantity' => 200000,
            ]
        )->assertStatus(422);

        $this->assertNull(
            $source->fresh()->social_service_id
        );
    }

}
