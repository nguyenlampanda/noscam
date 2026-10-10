<?php

namespace Tests\Feature\Digital;

use App\Models\DigitalOrder;
use App\Models\DigitalQuote;
use App\Models\DigitalService;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DigitalWalletPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(
        int $balance = 500000,
        string $pricingType = 'fixed',
        string $status = 'pending'
    ): array {
        $user = User::factory()->create(['role' => 'user']);

        $service = new DigitalService();
        $service->code = 'wallet-test-' . uniqid();
        $service->name = 'Dịch vụ kiểm thử thanh toán';
        $service->category = 'account_support';
        $service->platform = 'facebook';
        $service->pricing_type = $pricingType;
        $service->price_vnd = $pricingType === 'fixed'
            ? 300000
            : null;
        $service->requirements = [];
        $service->is_active = true;
        $service->sort_order = 0;
        $service->save();

        $order = new DigitalOrder();
        $order->user_id = $user->id;
        $order->digital_service_id = $service->id;
        $order->pricing_type = $pricingType;
        $order->status = $status;
        $order->payment_status = 'unpaid';
        $order->amount_vnd = $pricingType === 'fixed'
            ? 300000
            : null;
        $order->request_data = [];
        $order->save();

        Wallet::create([
            'user_id' => $user->id,
            'balance' => $balance,
            'total_deposited' => $balance,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        return [$user, $order];
    }

    private function url(DigitalOrder $order): string
    {
        return "/api/digital/orders/{$order->id}/pay-wallet";
    }

    public function test_guest_cannot_pay(): void
    {
        [, $order] = $this->makeOrder();

        $this->postJson($this->url($order))
            ->assertUnauthorized();

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_other_customer_cannot_pay(): void
    {
        [, $order] = $this->makeOrder();

        Sanctum::actingAs(User::factory()->create());

        $this->postJson($this->url($order))
            ->assertNotFound();

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_successful_payment_debits_once(): void
    {
        [$user, $order] = $this->makeOrder();

        Sanctum::actingAs($user);

        $this->postJson($this->url($order))
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'paid');

        $this->assertDatabaseHas('wallets', [
            'user_id' => $user->id,
            'balance' => 200000,
            'total_spent' => 300000,
        ]);

        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $user->id,
            'type' => 'order',
            'direction' => 'debit',
            'reference_type' => DigitalOrder::class,
            'reference_id' => $order->id,
        ]);

        $this->assertNotNull($order->fresh()->paid_at);
        $this->assertDatabaseCount('wallet_transactions', 1);
    }

    public function test_repeated_payment_does_not_debit_twice(): void
    {
        [$user, $order] = $this->makeOrder();

        Sanctum::actingAs($user);

        $this->postJson($this->url($order))->assertOk();

        $this->postJson($this->url($order))
            ->assertUnprocessable();

        $this->assertDatabaseCount('wallet_transactions', 1);

        $this->assertEquals(
            200000,
            (float) $user->wallet()->first()->balance
        );
    }

    public function test_insufficient_balance_does_not_change_order(): void
    {
        [$user, $order] = $this->makeOrder(100000);

        Sanctum::actingAs($user);

        $response = $this->postJson($this->url($order));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['payment']);

        $this->assertDatabaseHas('digital_orders', [
            'id' => $order->id,
            'payment_status' => 'unpaid',
            'paid_at' => null,
        ]);

        $this->assertDatabaseHas('wallets', [
            'user_id' => $user->id,
            'balance' => 100000,
        ]);

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_cancelled_order_cannot_be_paid(): void
    {
        [$user, $order] = $this->makeOrder(
            500000,
            'fixed',
            'cancelled'
        );

        Sanctum::actingAs($user);

        $this->postJson($this->url($order))
            ->assertUnprocessable();

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_quote_order_without_acceptance_cannot_be_paid(): void
    {
        [$user, $order] = $this->makeOrder(
            500000,
            'quote'
        );

        $order->amount_vnd = 300000;
        $order->save();

        Sanctum::actingAs($user);

        $this->postJson($this->url($order))
            ->assertUnprocessable();

        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_accepted_quote_can_be_paid(): void
    {
        [$user, $order] = $this->makeOrder(
            500000,
            'quote'
        );

        $order->amount_vnd = 300000;
        $order->save();

        $quote = new DigitalQuote();
        $quote->digital_order_id = $order->id;
        $quote->amount_vnd = 300000;
        $quote->status = 'accepted';
        $quote->accepted_at = now();
        $quote->save();

        Sanctum::actingAs($user);

        $this->postJson($this->url($order))
            ->assertOk();

        $this->assertDatabaseHas('digital_orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
        ]);

        $this->assertDatabaseCount('wallet_transactions', 1);
    }
}
