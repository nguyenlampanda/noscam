<?php

namespace Tests\Feature\Social;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Http\Controllers\Api\AdminSocialOrderReconciliationController;
use Illuminate\Http\Request;

class ReconciliationSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_reconciliation_requires_authentication(): void
    {
        $response = $this->postJson(
            '/api/admin/social/orders/999999/reconcile',
            []
        );

        $this->assertSame(401, $response->getStatusCode());
    }

    private function makeReconciliationOrder(): array
    {
        $customer = \App\Models\User::factory()->create();

        $service = \App\Models\SocialService::create([
            'code' => 'SAFETY-TEST-SERVICE',
            'platform' => 'instagram',
            'category' => 'followers',
            'name' => 'Safety Test',
            'min_quantity' => 10,
            'max_quantity' => 10000,
            'sell_price_per_1000' => 100000,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $order = \App\Models\SocialOrder::create([
            'code' => 'SAFETY-TEST-ORDER',
            'user_id' => $customer->id,
            'social_service_id' => $service->id,
            'target' => 'https://example.com/test',
            'quantity' => 100,
            'sell_amount' => 100000,
            'cost_amount' => 70000,
            'profit_amount' => 30000,
            'status' => 'pending',
            'attempts' => 1,
            'refunded_amount' => 0,
        ]);

        $audit = \App\Models\SocialOrderAudit::create([
            'social_order_id' => $order->id,
            'admin_id' => $customer->id,
            'result' => 'provider_not_received',
            'note' => 'Provider confirmed no order',
            'evidence' => 'Provider ticket SAFETY-TEST-001',
        ]);

        return [$order, $audit];
    }

    public function test_reconciliation_requires_explicit_confirmation(): void
    {
        [$order, $audit] = $this->makeReconciliationOrder();

        $admin = \App\Models\User::factory()->create([
            'role' => 'admin',
        ]);

        \Laravel\Sanctum\Sanctum::actingAs($admin, ['*']);

        $response = $this->postJson(
            "/api/admin/social/orders/{$order->id}/reconcile",
            ['audit_id' => $audit->id]
        );

        $response->assertStatus(422);

        $this->assertSame('pending', $order->fresh()->status);
        $this->assertEquals(0, $order->fresh()->refunded_amount);
    }

    public function test_confirmed_reconciliation_refunds_once(): void
    {
        [$order, $audit] = $this->makeReconciliationOrder();

        $admin = \App\Models\User::factory()->create([
            'role' => 'admin',
        ]);

        \Laravel\Sanctum\Sanctum::actingAs($admin, ['*']);

        $url = "/api/admin/social/orders/{$order->id}/reconcile";

        $payload = [
            'audit_id' => $audit->id,
            'confirmation' => 'CONFIRM_RECONCILIATION',
        ];

        $this->postJson($url, $payload)->assertOk();

        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertEquals(100000, $order->fresh()->refunded_amount);

        $this->assertEquals(
            100000,
            (float) \Illuminate\Support\Facades\DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );

        $this->postJson($url, $payload)->assertStatus(409);

        $this->assertEquals(
            100000,
            (float) \Illuminate\Support\Facades\DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );
    }

    public function test_testing_environment_uses_sqlite(): void
    {
        $this->assertSame(
            'sqlite',
            config('database.default')
        );
    }

    public function test_testing_environment_uses_array_cache(): void
    {
        $this->assertSame(
            'array',
            config('cache.default')
        );
    }
}
