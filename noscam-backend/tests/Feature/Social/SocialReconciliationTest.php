<?php

namespace Tests\Feature\Social;

use App\Models\User;
use App\Models\SocialOrder;
use App\Models\SocialOrderAudit;
use App\Models\SocialOrderResolution;
use App\Models\SocialService;
use App\Services\Social\SocialOrderReconciliationService;
use App\Services\Social\SocialOrderResolutionLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

class SocialReconciliationTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(string $code): SocialOrder
    {
        $user = User::factory()->create();

        $service = SocialService::create([
            'code' => 'SERVICE-'.$code,
            'platform' => 'instagram',
            'category' => 'followers',
            'name' => 'Test Followers',
            'min_quantity' => 10,
            'max_quantity' => 10000,
            'sell_price_per_1000' => 100000,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        return SocialOrder::create([
            'code' => $code,
            'user_id' => $user->id,
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
    }

    private function makeAudit(
        SocialOrder $order,
        string $result,
        ?string $providerId = null
    ): SocialOrderAudit {
        return SocialOrderAudit::create([
            'social_order_id' => $order->id,
            'admin_id' => $order->user_id,
            'result' => $result,
            'provider_order_id' => $providerId,
            'note' => 'Test reconciliation note',
            'evidence' => 'Test reconciliation evidence',
        ]);
    }

    private function resolve(
        SocialOrder $order,
        SocialOrderAudit $audit
    ): SocialOrder {
        return app(SocialOrderReconciliationService::class)
            ->resolve($order, $audit, $order->user_id);
    }

    public function test_provider_received_recovers_order_id(): void
    {
        $order = $this->makeOrder('TEST-REC-001');
        $audit = $this->makeAudit(
            $order,
            'provider_received',
            'PROVIDER-123'
        );

        $result = $this->resolve($order, $audit);

        $this->assertSame('processing', $result->status);
        $this->assertSame(
            'PROVIDER-123',
            $result->provider_order_id
        );

        $this->assertEquals(0, (float) $result->refunded_amount);

        $this->assertDatabaseHas('social_order_resolutions', [
            'social_order_id' => $order->id,
            'action' => 'provider_order_recovered',
        ]);
    }

    public function test_provider_not_received_refunds_order(): void
    {
        $order = $this->makeOrder('TEST-REC-002');
        $audit = $this->makeAudit(
            $order,
            'provider_not_received'
        );

        $result = $this->resolve($order, $audit);

        $this->assertSame('cancelled', $result->status);
        $this->assertEquals(
            100000,
            (float) $result->refunded_amount
        );

        $this->assertEquals(
            100000,
            (float) DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );

        $this->assertDatabaseHas('social_order_resolutions', [
            'social_order_id' => $order->id,
            'action' => 'refund_after_reconciliation',
        ]);
    }

    public function test_order_cannot_be_resolved_twice(): void
    {
        $order = $this->makeOrder('TEST-REC-003');
        $audit = $this->makeAudit(
            $order,
            'provider_not_received'
        );

        $this->resolve($order, $audit);

        try {
            $this->resolve($order, $audit);
            $this->fail('Duplicate resolution was allowed.');
        } catch (RuntimeException $e) {
            $this->assertSame(
                'Đơn không còn đủ điều kiện đối soát.',
                $e->getMessage()
            );
        }

        $this->assertSame(
            1,
            SocialOrderResolution::where(
                'social_order_id',
                $order->id
            )->count()
        );

        $this->assertEquals(
            100000,
            (float) DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );
    }

    public function test_old_audit_is_rejected(): void
    {
        $order = $this->makeOrder('TEST-REC-004');

        $old = $this->makeAudit(
            $order,
            'provider_not_received'
        );

        $this->makeAudit($order, 'uncertain');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'Phải sử dụng biên bản mới nhất.'
        );

        $this->resolve($order, $old);
    }

    public function test_audit_from_another_order_is_rejected(): void
    {
        $orderA = $this->makeOrder('TEST-REC-005A');
        $orderB = $this->makeOrder('TEST-REC-005B');

        $audit = $this->makeAudit(
            $orderB,
            'provider_not_received'
        );

        $this->expectException(
            \Illuminate\Database\Eloquent\ModelNotFoundException::class
        );

        $this->resolve($orderA, $audit);
    }

    public function test_logger_failure_rolls_back_refund(): void
    {
        $order = $this->makeOrder('TEST-REC-006');

        $audit = $this->makeAudit(
            $order,
            'provider_not_received'
        );

        $logger = \Mockery::mock(
            SocialOrderResolutionLogger::class
        );

        $logger->shouldReceive('record')
            ->once()
            ->andThrow(new RuntimeException('Logger failed'));

        $this->app->instance(
            SocialOrderResolutionLogger::class,
            $logger
        );

        try {
            $this->resolve($order, $audit);
            $this->fail('Expected logger failure.');
        } catch (RuntimeException $e) {
            $this->assertSame(
                'Logger failed',
                $e->getMessage()
            );
        }

        $this->assertSame(
            'pending',
            $order->fresh()->status
        );

        $this->assertEquals(
            0,
            (float) $order->fresh()->refunded_amount
        );

        $this->assertEquals(
            0,
            (float) DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );

        $this->assertSame(
            0,
            SocialOrderResolution::where(
                'social_order_id',
                $order->id
            )->count()
        );
    }
}
