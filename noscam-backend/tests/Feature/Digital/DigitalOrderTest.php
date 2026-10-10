<?php

namespace Tests\Feature\Digital;

use App\Models\DigitalOrder;
use App\Models\DigitalService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DigitalOrderTest extends TestCase
{
    use RefreshDatabase;

    private function service(
        bool $active = true,
        string $pricing = 'fixed'
    ): DigitalService {
        return DigitalService::create([
            'code' => 'TEST-DIGITAL-' . uniqid(),
            'category' => 'account_support',
            'name' => 'Dịch vụ thử nghiệm',
            'description' => 'Dùng cho kiểm thử',
            'pricing_type' => $pricing,
            'price_vnd' => $pricing === 'fixed' ? 150000 : null,
            'platform' => 'facebook',
            'requirements' => [
                [
                    'key' => 'profile_url',
                    'label' => 'Liên kết tài khoản',
                    'type' => 'url',
                    'required' => true,
                ],
                [
                    'key' => 'details',
                    'label' => 'Mô tả',
                    'type' => 'textarea',
                    'required' => false,
                ],
            ],
            'is_active' => $active,
            'sort_order' => 0,
        ]);
    }

    private function payload(DigitalService $service): array
    {
        return [
            'idempotency_key' => 'test-order-key-001',
            'service_id' => $service->id,
            'request_data' => [
                'profile_url' => 'https://example.com/profile',
                'details' => 'Cần hỗ trợ kiểm tra.',
            ],
        ];
    }

    public function test_guest_cannot_create_order(): void
    {
        $service = $this->service();

        $this->postJson(
            '/api/digital/orders',
            $this->payload($service)
        )->assertUnauthorized();

        $this->assertDatabaseCount('digital_orders', 0);
    }

    public function test_inactive_service_is_rejected(): void
    {
        $user = User::factory()->create();
        $service = $this->service(false);

        $this->actingAs($user)
            ->postJson(
                '/api/digital/orders',
                $this->payload($service)
            )
            ->assertUnprocessable();

        $this->assertDatabaseCount('digital_orders', 0);
    }

    public function test_required_field_is_validated(): void
    {
        $user = User::factory()->create();
        $service = $this->service();

        $this->actingAs($user)
            ->postJson('/api/digital/orders', [
                'idempotency_key' => 'test-order-key-002',
                'service_id' => $service->id,
                'request_data' => [],
            ])
            ->assertUnprocessable();

        $this->assertDatabaseCount('digital_orders', 0);
    }

    public function test_unknown_field_is_rejected(): void
    {
        $user = User::factory()->create();
        $service = $this->service();

        $payload = $this->payload($service);
        $payload['request_data']['admin_note'] = 'Injected';

        $this->actingAs($user)
            ->postJson('/api/digital/orders', $payload)
            ->assertUnprocessable();

        $this->assertDatabaseCount('digital_orders', 0);
    }

    public function test_invalid_url_is_rejected(): void
    {
        $user = User::factory()->create();
        $service = $this->service();

        $payload = $this->payload($service);
        $payload['request_data']['profile_url'] = 'not-a-url';

        $this->actingAs($user)
            ->postJson('/api/digital/orders', $payload)
            ->assertUnprocessable();

        $this->assertDatabaseCount('digital_orders', 0);
    }

    public function test_fixed_order_is_pending_and_unpaid(): void
    {
        $user = User::factory()->create();
        $service = $this->service();

        $payload = $this->payload($service);
        $payload['amount_vnd'] = 1;
        $payload['payment_status'] = 'paid';
        $payload['status'] = 'completed';

        $this->actingAs($user)
            ->postJson('/api/digital/orders', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('digital_orders', [
            'user_id' => $user->id,
            'digital_service_id' => $service->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'amount_vnd' => 150000,
            'payment_key' => null,
            'paid_at' => null,
        ]);

        $this->assertDatabaseCount('digital_orders', 1);
    }

    public function test_quote_order_has_no_amount(): void
    {
        $user = User::factory()->create();
        $service = $this->service(true, 'quote');

        $this->actingAs($user)
            ->postJson(
                '/api/digital/orders',
                $this->payload($service)
            )
            ->assertCreated();

        $this->assertDatabaseHas('digital_orders', [
            'user_id' => $user->id,
            'pricing_type' => 'quote',
            'amount_vnd' => null,
            'payment_status' => 'unpaid',
        ]);

        $this->assertDatabaseCount('digital_quotes', 0);
    }

    public function test_customer_cannot_view_another_customer_order(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $service = $this->service();

        $response = $this->actingAs($owner)
            ->postJson(
                '/api/digital/orders',
                $this->payload($service)
            )
            ->assertCreated();

        $orderId = $response->json('data.id');

        $this->actingAs($other)
            ->getJson("/api/digital/orders/{$orderId}")
            ->assertNotFound();

        $this->actingAs($other)
            ->getJson('/api/digital/orders')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($owner)
            ->getJson("/api/digital/orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('data.user_id', $owner->id);
    }

    public function test_order_creation_does_not_create_wallet_transactions(): void
    {
        $user = User::factory()->create();
        $service = $this->service();

        $this->actingAs($user)
            ->postJson(
                '/api/digital/orders',
                $this->payload($service)
            )
            ->assertCreated();

        $this->assertDatabaseCount('digital_orders', 1);

        $order = DigitalOrder::firstOrFail();

        $this->assertSame('pending', $order->status);
        $this->assertSame('unpaid', $order->payment_status);
        $this->assertNull($order->paid_at);
        $this->assertNull($order->payment_key);
    }

    public function test_same_request_returns_existing_order(): void
    {
        $user = User::factory()->create();
        $service = $this->service();
        $payload = $this->payload($service);

        $first = $this->actingAs($user)
            ->postJson('/api/digital/orders', $payload)
            ->assertCreated();

        $second = $this->actingAs($user)
            ->postJson('/api/digital/orders', $payload)
            ->assertOk()
            ->assertJsonPath('replayed', true);

        $this->assertSame(
            $first->json('data.id'),
            $second->json('data.id')
        );

        $this->assertDatabaseCount('digital_orders', 1);
    }

    public function test_same_key_with_different_content_returns_conflict(): void
    {
        $user = User::factory()->create();
        $service = $this->service();
        $payload = $this->payload($service);

        $this->actingAs($user)
            ->postJson('/api/digital/orders', $payload)
            ->assertCreated();

        $payload['request_data']['details'] =
            'Nội dung đã được thay đổi.';

        $this->actingAs($user)
            ->postJson('/api/digital/orders', $payload)
            ->assertStatus(409);

        $this->assertDatabaseCount('digital_orders', 1);
    }

    public function test_different_users_can_use_same_key(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $service = $this->service();
        $payload = $this->payload($service);

        $this->actingAs($firstUser)
            ->postJson('/api/digital/orders', $payload)
            ->assertCreated();

        $this->actingAs($secondUser)
            ->postJson('/api/digital/orders', $payload)
            ->assertCreated();

        $this->assertDatabaseCount('digital_orders', 2);
    }

}
