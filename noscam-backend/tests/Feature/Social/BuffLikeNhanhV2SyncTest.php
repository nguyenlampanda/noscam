<?php

namespace Tests\Feature\Social;

use App\Models\SocialOrder;
use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use App\Models\SocialService;
use App\Models\User;
use App\Services\Social\SocialOrderProviderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BuffLikeNhanhV2SyncTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(): SocialOrder
    {
        $user = User::factory()->create();

        $service = SocialService::create([
            'code' => 'TEST-BLN-SYNC',
            'platform' => 'instagram',
            'category' => 'followers',
            'name' => 'Test BuffLikeNhanh',
            'min_quantity' => 50,
            'max_quantity' => 100000,
            'sell_price_per_1000' => 100000,
            'is_active' => false,
            'sort_order' => 1,
        ]);

        $provider = SocialProvider::create([
            'name' => 'BuffLikeNhanh Test',
            'slug' => 'bufflikenhanh-sync-test',
            'driver' => 'bufflikenhanh_v2',
            'api_url' => 'https://provider.example/api/v2',
            'api_key' => 'fake-test-key',
            'status' => 'inactive',
            'currency' => 'VND',
            'exchange_rate_to_vnd' => 1,
            'price_multiplier' => 1,
        ]);

        $mapping = SocialProviderService::create([
            'social_provider_id' => $provider->id,
            'social_service_id' => $service->id,
            'provider_service_id' => '64500',
            'provider_service_name' => 'Test Instagram Follow',
            'cost_price_per_1000' => 49000,
            'min_quantity' => 50,
            'max_quantity' => 100000,
            'is_active' => false,
        ]);

        return SocialOrder::create([
            'code' => 'TEST-BLN-ORDER',
            'user_id' => $user->id,
            'social_service_id' => $service->id,
            'social_provider_id' => $provider->id,
            'social_provider_service_id' => $mapping->id,
            'provider_order_id' => 'FAKE-ORDER-123',
            'target' => 'https://example.com/test',
            'quantity' => 100,
            'sell_amount' => 10000,
            'cost_amount' => 4900,
            'profit_amount' => 5100,
            'status' => 'processing',
            'attempts' => 1,
            'refunded_amount' => 0,
            'remains' => 100,
        ]);
    }

    private function syncStatus(
        SocialOrder $order,
        string $status,
        int $remains
    ): SocialOrder {
        Http::fake([
            '*' => Http::response([
                'status' => $status,
                'start_count' => 0,
                'remains' => $remains,
                'currency' => 'VND',
            ]),
        ]);

        Http::preventStrayRequests();

        return app(SocialOrderProviderService::class)
            ->sync($order->fresh());
    }

    private function assertRefund(
        SocialOrder $order,
        float $amount,
        int $transactions
    ): void {
        $this->assertEquals(
            $amount,
            (float) $order->fresh()->refunded_amount
        );

        $this->assertEquals(
            $amount,
            (float) DB::table('wallets')
                ->where('user_id', $order->user_id)
                ->value('balance')
        );

        $this->assertSame(
            $transactions,
            DB::table('wallet_transactions')
                ->where('reference_type', SocialOrder::class)
                ->where('reference_id', $order->id)
                ->where('type', 'refund')
                ->count()
        );
    }

    public function test_pending_remains_processing(): void
    {
        $order = $this->makeOrder();

        $result = $this->syncStatus($order, 'Pending', 100);

        $this->assertSame('processing', $result->status);
        $this->assertSame(100, (int) $result->remains);
        $this->assertRefund($order, 0, 0);
    }

    public function test_in_progress_updates_remains(): void
    {
        $order = $this->makeOrder();

        $result = $this->syncStatus($order, 'In progress', 70);

        $this->assertSame('in_progress', $result->status);
        $this->assertSame(70, (int) $result->remains);
        $this->assertRefund($order, 0, 0);
    }

    public function test_completed_does_not_refund(): void
    {
        $order = $this->makeOrder();

        $result = $this->syncStatus($order, 'Completed', 0);

        $this->assertSame('completed', $result->status);
        $this->assertSame(0, (int) $result->remains);
        $this->assertNotNull($result->completed_at);
        $this->assertRefund($order, 0, 0);
    }

    public function test_partial_refunds_undelivered_quantity(): void
    {
        $order = $this->makeOrder();

        $result = $this->syncStatus($order, 'Partial', 40);

        $this->assertSame('partial', $result->status);
        $this->assertRefund($order, 4000, 1);
    }

    public function test_cancelled_refunds_full_amount(): void
    {
        $order = $this->makeOrder();

        $result = $this->syncStatus($order, 'Canceled', 100);

        $this->assertSame('cancelled', $result->status);
        $this->assertRefund($order, 10000, 1);
    }

    public function test_repeated_sync_does_not_refund_twice(): void
    {
        $order = $this->makeOrder();

        $this->syncStatus($order, 'Canceled', 100);
        $this->syncStatus($order, 'Canceled', 100);

        $this->assertRefund($order, 10000, 1);
    }

    public function test_refund_failure_rolls_back_terminal_status(): void
    {
        $order = $this->makeOrder();

        DB::statement("
            CREATE TRIGGER block_bln_refund
            BEFORE INSERT ON wallet_transactions
            WHEN NEW.type = 'refund'
            BEGIN
                SELECT RAISE(ABORT, 'Simulated wallet failure');
            END
        ");

        try {
            $this->syncStatus($order, 'Canceled', 100);
            $this->fail('Expected refund transaction to fail.');
        } catch (\Illuminate\Database\QueryException $e) {
            $this->assertStringContainsString(
                'Simulated wallet failure',
                $e->getMessage()
            );
        } finally {
            DB::statement("DROP TRIGGER IF EXISTS block_bln_refund");
        }

        $fresh = $order->fresh();

        $this->assertSame('processing', $fresh->status);
        $this->assertEquals(0, (float) $fresh->refunded_amount);
        $this->assertRefund($order, 0, 0);
    }

    public function test_refund_recovers_after_temporary_wallet_failure(): void
    {
        $order = $this->makeOrder();

        DB::statement("
            CREATE TRIGGER block_bln_refund_retry
            BEFORE INSERT ON wallet_transactions
            WHEN NEW.type = 'refund'
            BEGIN
                SELECT RAISE(ABORT, 'Simulated wallet failure');
            END
        ");

        try {
            $this->syncStatus($order, 'Partial', 40);
            $this->fail('Expected refund transaction to fail.');
        } catch (\Illuminate\Database\QueryException $e) {
            $this->assertStringContainsString(
                'Simulated wallet failure',
                $e->getMessage()
            );
        } finally {
            DB::statement("DROP TRIGGER IF EXISTS block_bln_refund_retry");
        }

        $this->assertSame('processing', $order->fresh()->status);

        $result = $this->syncStatus($order, 'Partial', 40);

        $this->assertSame('partial', $result->status);
        $this->assertRefund($order, 4000, 1);
    }

}
