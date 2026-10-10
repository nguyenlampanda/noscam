<?php

namespace Tests\Feature\Social;

use App\Models\User;
use App\Models\SocialOrder;
use App\Models\SocialOrderAudit;
use App\Models\SocialOrderResolution;
use App\Models\SocialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Tests\TestCase;

class SocialResolutionTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_order_cannot_have_two_final_resolutions(): void
    {
        $user = User::factory()->create();

        $service = SocialService::create([
            'code' => 'TEST-RESOLUTION',
            'platform' => 'instagram',
            'category' => 'followers',
            'name' => 'Test Followers',
            'min_quantity' => 10,
            'max_quantity' => 10000,
            'sell_price_per_1000' => 100000,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $order = SocialOrder::create([
            'code' => 'TEST-RES-001',
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

        $audit = SocialOrderAudit::create([
            'social_order_id' => $order->id,
            'admin_id' => $user->id,
            'result' => 'provider_not_received',
            'note' => 'Test reconciliation note',
            'evidence' => 'Test reconciliation evidence',
        ]);

        $data = [
            'social_order_id' => $order->id,
            'social_order_audit_id' => $audit->id,
            'admin_id' => $user->id,
            'action' => 'refund_after_reconciliation',
            'status_before' => 'pending',
            'status_after' => 'cancelled',
            'refund_amount' => 100000,
            'note' => 'Test resolution',
        ];

        SocialOrderResolution::create($data);

        $this->assertSame(
            1,
            SocialOrderResolution::where(
                'social_order_id',
                $order->id
            )->count()
        );

        try {
            SocialOrderResolution::create($data);

            $this->fail(
                'Database allowed duplicate resolution.'
            );
        } catch (QueryException $e) {
            $this->assertSame(
                1,
                SocialOrderResolution::where(
                    'social_order_id',
                    $order->id
                )->count()
            );
        }
    }
}
