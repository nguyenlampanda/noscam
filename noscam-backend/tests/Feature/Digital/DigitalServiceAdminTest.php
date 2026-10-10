<?php

namespace Tests\Feature\Digital;

use App\Models\DigitalService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DigitalServiceAdminTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $changes = []): array
    {
        return array_merge([
            'code' => 'test-pr-service',
            'category' => 'press_pr',
            'name' => 'Đăng bài PR',
            'description' => 'Dịch vụ đăng bài truyền thông',
            'pricing_type' => 'fixed',
            'price_vnd' => 250000,
            'platform' => 'other',
            'requirements' => [],
            'is_active' => true,
            'sort_order' => 0,
        ], $changes);
    }

    private function loginAs(string $role): void
    {
        $user = User::factory()->create([
            'role' => $role,
        ]);

        Sanctum::actingAs($user);
    }

    public function test_guest_cannot_access_admin_services(): void
    {
        $this->getJson('/api/admin/digital/services')
            ->assertUnauthorized();
    }

    public function test_moderator_cannot_create_service(): void
    {
        $this->loginAs('moderator');

        $this->postJson(
            '/api/admin/digital/services',
            $this->payload()
        )->assertForbidden();

        $this->assertDatabaseCount('digital_services', 0);
    }

    public function test_admin_can_create_fixed_price_service(): void
    {
        $this->loginAs('admin');

        $this->postJson(
            '/api/admin/digital/services',
            $this->payload()
        )->assertCreated();

        $this->assertDatabaseHas('digital_services', [
            'code' => 'test-pr-service',
            'pricing_type' => 'fixed',
            'price_vnd' => 250000,
        ]);
    }

    public function test_quote_service_has_no_fixed_price(): void
    {
        $this->loginAs('admin');

        $this->postJson(
            '/api/admin/digital/services',
            $this->payload([
                'pricing_type' => 'quote',
                'price_vnd' => 250000,
            ])
        )->assertCreated();

        $this->assertDatabaseHas('digital_services', [
            'code' => 'test-pr-service',
            'pricing_type' => 'quote',
            'price_vnd' => null,
        ]);
    }

    public function test_fixed_service_requires_positive_price(): void
    {
        $this->loginAs('admin');

        $this->postJson(
            '/api/admin/digital/services',
            $this->payload(['price_vnd' => 0])
        )->assertUnprocessable();

        $this->assertDatabaseCount('digital_services', 0);
    }

    public function test_admin_updates_only_selected_service(): void
    {
        $this->loginAs('admin');

        $first = DigitalService::create($this->payload());

        $second = DigitalService::create(
            $this->payload([
                'code' => 'second-service',
                'name' => 'Dịch vụ thứ hai',
            ])
        );

        $this->putJson(
            "/api/admin/digital/services/{$first->id}",
            $this->payload([
                'name' => 'Dịch vụ đã cập nhật',
            ])
        )->assertOk();

        $this->assertDatabaseHas('digital_services', [
            'id' => $first->id,
            'name' => 'Dịch vụ đã cập nhật',
        ]);

        $this->assertDatabaseHas('digital_services', [
            'id' => $second->id,
            'name' => 'Dịch vụ thứ hai',
        ]);
    }
}
