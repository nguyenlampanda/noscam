<?php

namespace Tests\Feature\Digital;

use App\Models\DigitalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicDigitalServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(array $changes = []): DigitalService
    {
        return DigitalService::create(array_merge([
            'code' => 'pr-test',
            'category' => 'press_pr',
            'name' => 'Đăng bài PR',
            'description' => 'Dịch vụ truyền thông',
            'pricing_type' => 'fixed',
            'price_vnd' => 250000,
            'platform' => 'other',
            'requirements' => [],
            'is_active' => true,
            'sort_order' => 0,
        ], $changes));
    }

    public function test_guest_can_see_active_services(): void
    {
        $this->service();

        $this->getJson('/api/digital/services')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'pr-test');
    }

    public function test_inactive_services_are_hidden(): void
    {
        $this->service(['is_active' => false]);

        $this->getJson('/api/digital/services')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_inactive_service_detail_returns_404(): void
    {
        $service = $this->service(['is_active' => false]);

        $this->getJson("/api/digital/services/{$service->id}")
            ->assertNotFound();
    }

    public function test_category_filter_works(): void
    {
        $this->service();

        $this->service([
            'code' => 'account-support',
            'category' => 'account_support',
            'name' => 'Hỗ trợ tài khoản',
        ]);

        $this->getJson(
            '/api/digital/services?category=press_pr'
        )
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'pr-test');
    }

    public function test_search_works(): void
    {
        $this->service();

        $this->getJson(
            '/api/digital/services?search=PR'
        )
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_public_response_excludes_internal_fields(): void
    {
        $service = $this->service();

        $this->getJson(
            "/api/digital/services/{$service->id}"
        )
            ->assertOk()
            ->assertJsonMissingPath('data.is_active')
            ->assertJsonMissingPath('data.created_at')
            ->assertJsonMissingPath('data.updated_at');
    }
}
