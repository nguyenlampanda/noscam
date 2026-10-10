<?php

namespace Tests\Feature\Digital;

use App\Models\DigitalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestDigitalOrderTest extends TestCase
{
    use RefreshDatabase;

    private function service(string $pricing = 'fixed'): DigitalService
    {
        return DigitalService::create([
            'code' => 'guest-test-'.uniqid(),
            'category' => 'account_support',
            'name' => 'Dịch vụ kiểm thử khách vãng lai',
            'description' => 'Kiểm thử API',
            'pricing_type' => $pricing,
            'price_vnd' => $pricing === 'fixed' ? 150000 : null,
            'platform' => 'facebook',
            'requirements' => [
                [
                    'key' => 'profile_url',
                    'label' => 'Liên kết',
                    'type' => 'url',
                    'required' => true,
                ],
            ],
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }

    private function payload(DigitalService $service): array
    {
        return [
            'idempotency_key' => 'guest-key-'.bin2hex(random_bytes(8)),
            'service_id' => $service->id,
            'guest_name' => 'Khach thu nghiem',
            'guest_phone' => '0901234567',
            'guest_email' => 'guest@example.com',
            'request_data' => [
                'profile_url' => 'https://example.com/profile',
            ],
        ];
    }

    public function test_guest_can_create_fixed_order(): void
    {
        $service = $this->service();

        $response = $this->postJson(
            '/api/digital/guest/orders',
            $this->payload($service)
        )->assertCreated()
         ->assertJsonPath('data.payment_status', 'unpaid')
         ->assertJsonPath('data.bank.account_number', '999321');

        $this->assertMatchesRegularExpression(
            '/^[a-f0-9]{64}$/',
            $response->json('data.lookup_token')
        );

        $this->assertDatabaseHas('digital_orders', [
            'id' => $response->json('data.id'),
            'user_id' => null,
            'amount_vnd' => 150000,
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_correct_token_can_lookup_order(): void
    {
        $service = $this->service();

        $created = $this->postJson(
            '/api/digital/guest/orders',
            $this->payload($service)
        )->assertCreated();

        $id = $created->json('data.id');
        $token = $created->json('data.lookup_token');

        $this->postJson("/api/digital/guest/orders/{$id}/lookup", [
            'lookup_token' => $token,
        ])->assertOk()
          ->assertJsonPath('data.id', $id)
          ->assertJsonPath('data.bank.account_number', '999321')
          ->assertJsonMissingPath('data.guest_phone')
          ->assertJsonMissingPath('data.guest_lookup_hash');
    }

    public function test_wrong_token_cannot_lookup_order(): void
    {
        $service = $this->service();

        $created = $this->postJson(
            '/api/digital/guest/orders',
            $this->payload($service)
        )->assertCreated();

        $id = $created->json('data.id');

        $this->postJson("/api/digital/guest/orders/{$id}/lookup", [
            'lookup_token' => str_repeat('a', 64),
        ])->assertNotFound();
    }

    public function test_reused_key_does_not_expose_order(): void
    {
        $service = $this->service();
        $payload = $this->payload($service);

        $this->postJson(
            '/api/digital/guest/orders',
            $payload
        )->assertCreated();

        $this->postJson(
            '/api/digital/guest/orders',
            $payload
        )->assertStatus(409)
         ->assertJsonMissingPath('data.id')
         ->assertJsonMissingPath('data.lookup_token');

        $this->assertDatabaseCount('digital_orders', 1);
    }

    public function test_unknown_request_field_is_rejected(): void
    {
        $service = $this->service();
        $payload = $this->payload($service);
        $payload['request_data']['admin_note'] = 'Injected';

        $this->postJson(
            '/api/digital/guest/orders',
            $payload
        )->assertUnprocessable();

        $this->assertDatabaseCount('digital_orders', 0);
    }

    public function test_quote_order_has_no_bank_before_quote(): void
    {
        $service = $this->service('quote');

        $created = $this->postJson(
            '/api/digital/guest/orders',
            $this->payload($service)
        )->assertCreated()
         ->assertJsonPath('data.amount_vnd', null)
         ->assertJsonPath('data.bank', null);

        $id = $created->json('data.id');

        $this->postJson("/api/digital/guest/orders/{$id}/lookup", [
            'lookup_token' => $created->json('data.lookup_token'),
        ])->assertOk()
          ->assertJsonPath('data.bank', null);
    }

    public function test_creating_order_does_not_mark_paid(): void
    {
        $service = $this->service();

        $this->postJson(
            '/api/digital/guest/orders',
            $this->payload($service)
        )->assertCreated();

        $this->assertDatabaseHas('digital_orders', [
            'payment_status' => 'unpaid',
            'paid_at' => null,
        ]);

        $this->assertDatabaseCount('digital_order_payments', 0);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    private function guestQuoteScenario(
        ?string $expiresAt = null
    ): array {
        $service = $this->service('quote');

        $created = $this->postJson(
            '/api/digital/guest/orders',
            $this->payload($service)
        )->assertCreated();

        $id = $created->json('data.id');
        $token = $created->json('data.lookup_token');

        $quoteId = \Illuminate\Support\Facades\DB::table(
            'digital_quotes'
        )->insertGetId([
            'digital_order_id' => $id,
            'admin_id' => null,
            'amount_vnd' => 250000,
            'description' => 'Báo giá khách vãng lai',
            'status' => 'pending',
            'expires_at' => $expiresAt,
            'accepted_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $endpoint = "/api/digital/guest/orders/{$id}"
            ."/quotes/{$quoteId}/respond";

        return [$id, $token, $quoteId, $endpoint];
    }

    public function test_guest_can_accept_quote_and_then_see_bank(): void
    {
        [$id, $token, $quoteId, $endpoint] =
            $this->guestQuoteScenario();

        $this->postJson($endpoint, [
            'lookup_token' => $token,
            'action' => 'accept',
        ])->assertOk()
          ->assertJsonPath('data.quote_status', 'accepted')
          ->assertJsonPath('data.payment_status', 'unpaid');

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quoteId,
            'status' => 'accepted',
        ]);

        $this->assertDatabaseHas('digital_orders', [
            'id' => $id,
            'amount_vnd' => 250000,
            'payment_status' => 'unpaid',
            'paid_at' => null,
        ]);

        $this->postJson(
            "/api/digital/guest/orders/{$id}/lookup",
            ['lookup_token' => $token]
        )->assertOk()
          ->assertJsonPath('data.bank.account_number', '999321')
          ->assertJsonPath('data.bank_transfer_content', 'NSD'.$id);

        $this->assertDatabaseCount('digital_order_payments', 0);
        $this->assertDatabaseCount('wallet_transactions', 0);
    }

    public function test_guest_can_reject_quote_without_bank(): void
    {
        [$id, $token, $quoteId, $endpoint] =
            $this->guestQuoteScenario();

        $this->postJson($endpoint, [
            'lookup_token' => $token,
            'action' => 'reject',
        ])->assertOk()
          ->assertJsonPath('data.quote_status', 'rejected');

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quoteId,
            'status' => 'rejected',
        ]);

        $this->postJson(
            "/api/digital/guest/orders/{$id}/lookup",
            ['lookup_token' => $token]
        )->assertOk()
          ->assertJsonPath('data.amount_vnd', null)
          ->assertJsonPath('data.bank', null);
    }

    public function test_wrong_secret_cannot_respond_to_quote(): void
    {
        [$id, $token, $quoteId, $endpoint] =
            $this->guestQuoteScenario();

        $wrong = str_repeat(
            $token[0] === 'a' ? 'b' : 'a',
            64
        );

        $this->postJson($endpoint, [
            'lookup_token' => $wrong,
            'action' => 'accept',
        ])->assertNotFound();

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quoteId,
            'status' => 'pending',
        ]);
    }

    public function test_guest_cannot_accept_quote_twice(): void
    {
        [$id, $token, $quoteId, $endpoint] =
            $this->guestQuoteScenario();

        $payload = [
            'lookup_token' => $token,
            'action' => 'accept',
        ];

        $this->postJson($endpoint, $payload)->assertOk();
        $this->postJson($endpoint, $payload)->assertUnprocessable();

        $this->assertDatabaseHas('digital_orders', [
            'id' => $id,
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_expired_guest_quote_cannot_be_accepted(): void
    {
        [$id, $token, $quoteId, $endpoint] =
            $this->guestQuoteScenario(
                now()->subDay()->toDateTimeString()
            );

        $this->postJson($endpoint, [
            'lookup_token' => $token,
            'action' => 'accept',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quoteId,
            'status' => 'pending',
        ]);
    }

    public function test_guest_quote_must_belong_to_order(): void
    {
        [$id, $token] = $this->guestQuoteScenario();
        [, , $otherQuote] = $this->guestQuoteScenario();

        $this->postJson(
            "/api/digital/guest/orders/{$id}"
                ."/quotes/{$otherQuote}/respond",
            [
                'lookup_token' => $token,
                'action' => 'accept',
            ]
        )->assertNotFound();
    }

    public function test_invalid_guest_quote_action_is_rejected(): void
    {
        [$id, $token, $quoteId, $endpoint] =
            $this->guestQuoteScenario();

        $this->postJson($endpoint, [
            'lookup_token' => $token,
            'action' => 'delete',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quoteId,
            'status' => 'pending',
        ]);
    }

    public function test_cancelled_guest_order_cannot_accept_quote(): void
    {
        [$id, $token, $quoteId, $endpoint] =
            $this->guestQuoteScenario();

        \Illuminate\Support\Facades\DB::table('digital_orders')
            ->where('id', $id)
            ->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);

        $this->postJson($endpoint, [
            'lookup_token' => $token,
            'action' => 'accept',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('digital_quotes', [
            'id' => $quoteId,
            'status' => 'pending',
        ]);
    }

}
