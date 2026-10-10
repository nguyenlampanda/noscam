<?php

namespace Tests\Feature\Digital;

use App\Models\DigitalOrder;
use App\Models\DigitalQuote;
use App\Models\DigitalService;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDigitalBankPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function createOrder(
        string $pricingType = 'fixed',
        string $status = 'pending'
    ): DigitalOrder {
        $customer = User::factory()->create([
            'role' => 'user',
        ]);

        $service = DigitalService::create([
            'code' => 'bank-test-' . uniqid(),
            'category' => 'account_support',
            'name' => 'Dịch vụ kiểm thử chuyển khoản',
            'pricing_type' => $pricingType,
            'price_vnd' => $pricingType === 'fixed'
                ? 150000
                : null,
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
        $order->amount_vnd = $pricingType === 'fixed'
            ? 150000
            : null;
        $order->payment_status = 'unpaid';
        $order->request_data = [];
        $order->save();

        return $order;
    }

    private function loginAs(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function url(DigitalOrder $order): string
    {
        return "/api/admin/digital/orders/{$order->id}/confirm-bank-payment";
    }

    private function payload(string $reference = 'BANK123456'): array
    {
        return [
            'bank_reference' => $reference,
            'note' => 'Đã đối soát giao dịch ngân hàng',
        ];
    }

    public function test_guest_cannot_confirm(): void
    {
        $order = $this->createOrder();

        $this->postJson($this->url($order), $this->payload())
            ->assertUnauthorized();

        $this->assertDatabaseCount('digital_order_payments', 0);
    }

    public function test_customer_cannot_confirm(): void
    {
        $order = $this->createOrder();
        $this->loginAs('user');

        $this->postJson($this->url($order), $this->payload())
            ->assertForbidden();

        $this->assertDatabaseCount('digital_order_payments', 0);
    }

    public function test_moderator_cannot_confirm(): void
    {
        $order = $this->createOrder();
        $this->loginAs('moderator');

        $this->postJson($this->url($order), $this->payload())
            ->assertForbidden();

        $this->assertDatabaseCount('digital_order_payments', 0);
    }

    public function test_admin_confirms_bank_payment_without_touching_wallet(): void
    {
        $order = $this->createOrder();
        $admin = $this->loginAs('admin');

        Wallet::create([
            'user_id' => $order->user_id,
            'balance' => 500000,
            'total_deposited' => 500000,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $this->postJson(
            $this->url($order),
            $this->payload('BANK-SUCCESS-001')
        )->assertOk()
            ->assertJsonPath('data.payment_status', 'paid');

        $this->assertDatabaseHas('digital_orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
        ]);

        $this->assertNotNull($order->fresh()->paid_at);

        $this->assertDatabaseHas('digital_order_payments', [
            'digital_order_id' => $order->id,
            'method' => 'bank_transfer',
            'status' => 'confirmed',
            'amount_vnd' => 150000,
            'bank_reference' => 'BANK-SUCCESS-001',
            'confirmed_by' => $admin->id,
        ]);

        $this->assertDatabaseHas('wallets', [
            'user_id' => $order->user_id,
            'balance' => 500000,
            'total_spent' => 0,
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
        $this->assertDatabaseCount('digital_order_payments', 1);
    }

    public function test_same_order_cannot_be_confirmed_twice(): void
    {
        $order = $this->createOrder();
        $this->loginAs('admin');

        $this->postJson(
            $this->url($order),
            $this->payload('BANK-DOUBLE-001')
        )->assertOk();

        $this->postJson(
            $this->url($order),
            $this->payload('BANK-DOUBLE-002')
        )->assertUnprocessable();

        $this->assertDatabaseCount('digital_order_payments', 1);
    }

    public function test_bank_reference_cannot_be_reused_for_another_order(): void
    {
        $first = $this->createOrder();
        $second = $this->createOrder();

        $this->loginAs('admin');

        $this->postJson(
            $this->url($first),
            $this->payload('BANK-UNIQUE-001')
        )->assertOk();

        $this->postJson(
            $this->url($second),
            $this->payload('BANK-UNIQUE-001')
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['bank_reference']);

        $this->assertDatabaseHas('digital_orders', [
            'id' => $second->id,
            'payment_status' => 'unpaid',
        ]);

        $this->assertDatabaseCount('digital_order_payments', 1);
    }

    public function test_cancelled_order_cannot_be_confirmed(): void
    {
        $order = $this->createOrder('fixed', 'cancelled');
        $this->loginAs('admin');

        $this->postJson(
            $this->url($order),
            $this->payload()
        )->assertUnprocessable();

        $this->assertDatabaseCount('digital_order_payments', 0);
    }

    public function test_invalid_bank_reference_is_rejected(): void
    {
        $order = $this->createOrder();
        $this->loginAs('admin');

        $this->postJson($this->url($order), [
            'bank_reference' => ' ',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['bank_reference']);

        $this->assertDatabaseCount('digital_order_payments', 0);
    }

    public function test_quote_order_without_accepted_quote_is_rejected(): void
    {
        $order = $this->createOrder('quote');
        $order->amount_vnd = 150000;
        $order->save();

        $this->loginAs('admin');

        $this->postJson(
            $this->url($order),
            $this->payload()
        )->assertUnprocessable();

        $this->assertDatabaseCount('digital_order_payments', 0);
    }

    public function test_accepted_quote_can_be_paid_by_bank(): void
    {
        $order = $this->createOrder('quote');
        $admin = $this->loginAs('admin');

        $order->amount_vnd = 150000;
        $order->save();

        $quote = new DigitalQuote();
        $quote->digital_order_id = $order->id;
        $quote->admin_id = $admin->id;
        $quote->amount_vnd = 150000;
        $quote->status = 'accepted';
        $quote->accepted_at = now();
        $quote->save();

        $this->postJson(
            $this->url($order),
            $this->payload('BANK-QUOTE-001')
        )->assertOk();

        $this->assertDatabaseHas('digital_orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
        ]);

        $this->assertDatabaseCount('digital_order_payments', 1);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }
}
