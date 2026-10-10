<?php

namespace Tests\Feature\Social;

use App\Models\User;
use App\Models\SocialOrder;
use App\Models\SocialService;
use App\Services\Social\SocialOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SocialRefundTest extends TestCase
{
    use RefreshDatabase;

    private function createTestOrder(): SocialOrder
    {
        $user = User::factory()->create();

        $service = SocialService::create([
            'code' => 'TEST-SERVICE-001',
            'platform' => 'instagram',
            'category' => 'followers',
            'name' => 'Test Instagram Followers',
            'min_quantity' => 10,
            'max_quantity' => 10000,
            'sell_price_per_1000' => 100000,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        return SocialOrder::create([
            'social_service_id' => $service->id,
            'code' => 'TEST-REFUND-001',
            'user_id' => $user->id,
            'target' => 'https://example.com/test',
            'quantity' => 100,
            'sell_amount' => 100000,
            'cost_amount' => 70000,
            'profit_amount' => 30000,
            'status' => 'cancelled',
            'attempts' => 1,
            'refunded_amount' => 0,
        ]);
    }

    public function test_refund_credits_wallet_once(): void
    {
        $order = $this->createTestOrder();

        $service = app(SocialOrderService::class);

        $service->refund($order);

        $this->assertEquals(
            100000,
            (float) $order->fresh()->refunded_amount
        );

        $this->assertEquals(
            100000,
            (float) DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );

        $service->refund($order->fresh());

        $this->assertEquals(
            100000,
            (float) DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );
    }

    public function test_refund_does_not_exceed_order_amount(): void
    {
        $order = $this->createTestOrder();

        $order->update([
            'refunded_amount' => 40000,
        ]);

        app(SocialOrderService::class)
            ->refund($order->fresh());

        $this->assertEquals(
            100000,
            (float) $order->fresh()->refunded_amount
        );

        $this->assertEquals(
            60000,
            (float) DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );
    }

    public function test_refund_is_rolled_back_when_transaction_fails(): void
    {
        $order = $this->createTestOrder();

        try {
            DB::transaction(function () use ($order) {
                app(SocialOrderService::class)
                    ->refund($order);

                throw new \RuntimeException('Simulated failure');
            });
        } catch (\RuntimeException $e) {
            $this->assertSame(
                'Simulated failure',
                $e->getMessage()
            );
        }

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

        $this->assertEquals(
            0,
            DB::table('wallet_transactions')
                ->where('reference_type', SocialOrder::class)
                ->where('reference_id', $order->id)
                ->count()
        );
    }

}
