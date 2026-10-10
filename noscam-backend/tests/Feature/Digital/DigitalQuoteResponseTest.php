<?php

namespace Tests\Feature\Digital;

use App\Models\DigitalOrder;
use App\Models\DigitalQuote;
use App\Models\DigitalService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DigitalQuoteResponseTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(): array
    {
        $customer = User::factory()->create(['role' => 'user']);

        $service = DigitalService::create([
            'code' => 'response-test-' . uniqid(),
            'category' => 'account_support',
            'name' => 'Dịch vụ báo giá thử nghiệm',
            'pricing_type' => 'quote',
            'price_vnd' => null,
            'platform' => 'facebook',
            'requirements' => [],
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $order = new DigitalOrder();
        $order->user_id = $customer->id;
        $order->digital_service_id = $service->id;
        $order->pricing_type = 'quote';
        $order->status = 'pending';
        $order->payment_status = 'unpaid';
        $order->amount_vnd = null;
        $order->request_data = [];
        $order->save();

        $quote = new DigitalQuote();
        $quote->digital_order_id = $order->id;
        $quote->amount_vnd = 300000;
        $quote->status = 'pending';
        $quote->description = 'Báo giá thử nghiệm';
        $quote->save();

        return [$customer, $order, $quote];
    }

    private function endpoint(
        DigitalOrder $order,
        DigitalQuote $quote
    ): string {
        return "/api/digital/orders/{$order->id}/quotes/{$quote->id}/respond";
    }

    public function test_guest_cannot_respond(): void
    {
        [, $order, $quote] = $this->makeOrder();

        $this->postJson($this->endpoint($order, $quote), [
            'action' => 'accept',
        ])->assertUnauthorized();

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quote->id,
            'status' => 'pending',
        ]);
    }

    public function test_other_customer_cannot_respond(): void
    {
        [, $order, $quote] = $this->makeOrder();

        Sanctum::actingAs(
            User::factory()->create(['role' => 'user'])
        );

        $this->postJson($this->endpoint($order, $quote), [
            'action' => 'accept',
        ])->assertNotFound();
    }

    public function test_customer_can_accept_quote(): void
    {
        [$customer, $order, $quote] = $this->makeOrder();

        Sanctum::actingAs($customer);

        $this->postJson($this->endpoint($order, $quote), [
            'action' => 'accept',
        ])
            ->assertOk()
            ->assertJsonPath('data.quote.status', 'accepted');

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quote->id,
            'status' => 'accepted',
        ]);

        $this->assertNotNull($quote->fresh()->accepted_at);

        $this->assertDatabaseHas('digital_orders', [
            'id' => $order->id,
            'amount_vnd' => 300000,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'paid_at' => null,
        ]);
    }

    public function test_customer_can_reject_quote(): void
    {
        [$customer, $order, $quote] = $this->makeOrder();

        Sanctum::actingAs($customer);

        $this->postJson($this->endpoint($order, $quote), [
            'action' => 'reject',
        ])->assertOk();

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quote->id,
            'status' => 'rejected',
        ]);

        $this->assertDatabaseHas('digital_orders', [
            'id' => $order->id,
            'amount_vnd' => null,
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_expired_quote_cannot_be_accepted(): void
    {
        [$customer, $order, $quote] = $this->makeOrder();

        $quote->expires_at = now()->subMinute();
        $quote->save();

        Sanctum::actingAs($customer);

        $this->postJson($this->endpoint($order, $quote), [
            'action' => 'accept',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quote->id,
            'status' => 'pending',
        ]);
    }

    public function test_quote_cannot_be_accepted_twice(): void
    {
        [$customer, $order, $quote] = $this->makeOrder();

        Sanctum::actingAs($customer);

        $this->postJson($this->endpoint($order, $quote), [
            'action' => 'accept',
        ])->assertOk();

        $this->postJson($this->endpoint($order, $quote), [
            'action' => 'accept',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('digital_quotes', 1);
    }

    public function test_quote_must_belong_to_order(): void
    {
        [$customer, $order] = $this->makeOrder();
        [, , $otherQuote] = $this->makeOrder();

        Sanctum::actingAs($customer);

        $this->postJson(
            $this->endpoint($order, $otherQuote),
            ['action' => 'accept']
        )->assertNotFound();
    }

    public function test_invalid_action_is_rejected(): void
    {
        [$customer, $order, $quote] = $this->makeOrder();

        Sanctum::actingAs($customer);

        $this->postJson($this->endpoint($order, $quote), [
            'action' => 'invalid',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quote->id,
            'status' => 'pending',
        ]);
    }
}
