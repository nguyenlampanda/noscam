<?php

namespace Tests\Feature\Digital;

use App\Models\DigitalOrder;
use App\Models\DigitalService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDigitalQuoteTest extends TestCase
{
    use RefreshDatabase;

    private function loginAs(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);

        Sanctum::actingAs($user);

        return $user;
    }

    private function createOrder(
        string $pricingType = 'quote',
        string $status = 'pending'
    ): DigitalOrder {
        $customer = User::factory()->create([
            'role' => 'user',
        ]);

        $service = DigitalService::create([
            'code' => 'quote-test-' . uniqid(),
            'category' => 'account_support',
            'name' => 'Dịch vụ kiểm thử báo giá',
            'description' => 'Kiểm thử API báo giá',
            'pricing_type' => $pricingType,
            'price_vnd' => $pricingType === 'fixed' ? 150000 : null,
            'platform' => 'facebook',
            'requirements' => [],
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $order = new DigitalOrder();
        $order->user_id = $customer->id;
        $order->digital_service_id = $service->id;
        $order->status = $status;
        $order->pricing_type = $pricingType;
        $order->amount_vnd =
            $pricingType === 'fixed' ? 150000 : null;
        $order->payment_status = 'unpaid';
        $order->request_data = [];
        $order->save();

        return $order;
    }

    private function endpoint(DigitalOrder $order): string
    {
        return "/api/admin/digital/orders/{$order->id}/quotes";
    }

    public function test_guest_cannot_create_quote(): void
    {
        $order = $this->createOrder();

        $this->postJson($this->endpoint($order), [
            'amount_vnd' => 300000,
        ])->assertUnauthorized();

        $this->assertDatabaseCount('digital_quotes', 0);
    }

    public function test_customer_and_moderator_cannot_create_quote(): void
    {
        $order = $this->createOrder();

        foreach (['user', 'moderator'] as $role) {
            $this->loginAs($role);

            $this->postJson($this->endpoint($order), [
                'amount_vnd' => 300000,
            ])->assertForbidden();
        }

        $this->assertDatabaseCount('digital_quotes', 0);
    }

    public function test_admin_can_create_quote(): void
    {
        $order = $this->createOrder();
        $admin = $this->loginAs('admin');

        $this->postJson($this->endpoint($order), [
            'amount_vnd' => 300000,
            'description' => 'Chi phí xử lý tài khoản',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath(
                'data.description',
                'Chi phí xử lý tài khoản'
            );

        $this->assertDatabaseHas('digital_quotes', [
            'digital_order_id' => $order->id,
            'admin_id' => $admin->id,
            'amount_vnd' => 300000,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('digital_orders', [
            'id' => $order->id,
            'status' => 'pending',
            'amount_vnd' => null,
            'payment_status' => 'unpaid',
            'paid_at' => null,
        ]);
    }

    public function test_admin_cannot_create_duplicate_pending_quote(): void
    {
        $order = $this->createOrder();
        $this->loginAs('admin');

        $this->postJson($this->endpoint($order), [
            'amount_vnd' => 300000,
        ])->assertCreated();

        $this->postJson($this->endpoint($order), [
            'amount_vnd' => 350000,
        ])->assertUnprocessable();

        $this->assertDatabaseCount('digital_quotes', 1);
    }

    public function test_invalid_amount_is_rejected(): void
    {
        $order = $this->createOrder();
        $this->loginAs('admin');

        foreach ([0, -100, 'abc'] as $amount) {
            $this->postJson($this->endpoint($order), [
                'amount_vnd' => $amount,
            ])->assertUnprocessable();
        }

        $this->assertDatabaseCount('digital_quotes', 0);
    }

    public function test_fixed_price_order_cannot_receive_quote(): void
    {
        $order = $this->createOrder('fixed');
        $this->loginAs('admin');

        $this->postJson($this->endpoint($order), [
            'amount_vnd' => 300000,
        ])->assertUnprocessable();

        $this->assertDatabaseCount('digital_quotes', 0);
    }

    public function test_cancelled_order_cannot_receive_quote(): void
    {
        $order = $this->createOrder('quote', 'cancelled');
        $this->loginAs('admin');

        $this->postJson($this->endpoint($order), [
            'amount_vnd' => 300000,
        ])->assertUnprocessable();

        $this->assertDatabaseCount('digital_quotes', 0);

        $this->assertDatabaseHas('digital_orders', [
            'id' => $order->id,
            'status' => 'cancelled',
            'amount_vnd' => null,
            'payment_status' => 'unpaid',
        ]);
    }
}
