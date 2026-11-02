<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExchangeFreeFlowTest extends TestCase
{
    use RefreshDatabase;

    private function account(User $user, string $handle): int
    {
        return (int) $this->actingAs($user, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram', 'account' => $handle,
            ])->assertCreated()->json('data.id');
    }

    private function campaign(User $user, int $accountId, string $handle, int $quantity = 10): int
    {
        return (int) $this->actingAs($user, 'sanctum')
            ->withHeaders(['Idempotency-Key' => 'free-exchange-test-'. $handle])
            ->postJson('/api/exchange/campaigns', [
                'platform' => 'instagram', 'task_type' => 'follow',
                'target_url' => "https://www.instagram.com/{$handle}/",
                'quantity' => $quantity, 'rules_accepted' => true,
                'is_free_reciprocal' => true, 'social_account_id' => $accountId,
            ])->assertCreated()->assertJsonPath('data.budget_total', 0)->json('data.id');
    }

    private function submit(User $user, int $campaignId, array $ids): void
    {
        $this->actingAs($user, 'sanctum')
            ->postJson("/api/exchange/reciprocal/{$campaignId}/tick", [
                'perform_account_ids' => $ids,
                'return_allocations' => [
                    [
                        'account_id' => $ids[0],
                        'quantity' => count($ids),
                    ],
                ],
            ])->assertOk();
    }

    private function balance(User $user): array
    {
        $rows = $this->actingAs($user, 'sanctum')
            ->getJson('/api/exchange/reciprocal')->assertOk()->json('data.balances');
        return collect($rows)->first(fn ($r) => $r['platform'] === 'instagram' && $r['task_type'] === 'follow');
    }

    public function test_free_campaign_and_claim_do_not_move_coins(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();
        $a = $this->account($owner, 'freeowner');
        $b = $this->account($worker, 'freeworker');
        $id = $this->campaign($owner, $a, 'freeowner');
        $this->submit($worker, $id, [$b]);
        $claim = ExchangeTaskClaim::where('campaign_id', $id)->firstOrFail();
        $this->assertSame('pending_review', $claim->reciprocal_status);
        $this->assertSame(0, ExchangeEscrowEntry::count());
        $this->assertSame(0, $this->balance($worker)['performed']);
        $this->actingAs($owner, 'sanctum')->postJson(
            "/api/exchange/reciprocal/claims/{$claim->id}/return", ['decision' => 'approve', 'return_account_id' => $a]
        )->assertOk();
        $this->assertSame(1, $this->balance($owner)['received']);
        $this->assertSame(1, $this->balance($owner)['owed']);
        $this->assertSame(1, $this->balance($worker)['performed']);
        $this->assertSame(1, $this->balance($worker)['available_to_receive']);
        $this->assertSame(0, ExchangeEscrowEntry::count());
    }

    public function test_duplicate_account_and_excess_capacity_are_rejected(): void
    {
        $owner = User::factory()->create(); $worker = User::factory()->create();
        $a = $this->account($owner, 'limitedowner');
        $b = $this->account($worker, 'limitedworker');
        $id = $this->campaign($owner, $a, 'limitedowner', 1);
        $this->submit($worker, $id, [$b]);
        $this->actingAs($worker, 'sanctum')->postJson(
            "/api/exchange/reciprocal/{$id}/tick", ['perform_account_ids' => [$b]]
        )->assertUnprocessable();
        $this->assertSame(1, ExchangeTaskClaim::where('campaign_id', $id)->count());
    }

    public function test_worker_cannot_approve_and_approval_cannot_repeat(): void
    {
        $owner = User::factory()->create(); $worker = User::factory()->create();
        $a = $this->account($owner, 'reviewowner');
        $b = $this->account($worker, 'reviewworker');
        $id = $this->campaign($owner, $a, 'reviewowner');
        $this->submit($worker, $id, [$b]);
        $claimId = ExchangeTaskClaim::where('campaign_id', $id)->value('id');
        $url = "/api/exchange/reciprocal/claims/{$claimId}/return";
        $this->actingAs($worker, 'sanctum')->postJson($url, ['decision' => 'approve', 'return_account_id' => $a])->assertForbidden();
        $this->actingAs($owner, 'sanctum')->postJson($url, ['decision' => 'approve', 'return_account_id' => $a])->assertOk();
        $this->actingAs($owner, 'sanctum')->postJson($url, ['decision' => 'approve', 'return_account_id' => $a])->assertUnprocessable();
        $this->assertSame(1, $this->balance($worker)['performed']);
    }

    public function test_rejected_work_does_not_create_credit(): void
    {
        $owner = User::factory()->create(); $worker = User::factory()->create();
        $a = $this->account($owner, 'rejectowner');
        $b = $this->account($worker, 'rejectworker');
        $id = $this->campaign($owner, $a, 'rejectowner');
        $this->submit($worker, $id, [$b]);
        $claimId = ExchangeTaskClaim::where('campaign_id', $id)->value('id');
        $this->actingAs($owner, 'sanctum')->postJson(
            "/api/exchange/reciprocal/claims/{$claimId}/return", ['decision' => 'reject']
        )->assertOk();
        $this->assertSame(0, $this->balance($owner)['received']);
        $this->assertSame(0, $this->balance($worker)['performed']);
    }

    public function test_paid_campaign_request_is_blocked(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner, 'sanctum')->postJson('/api/exchange/campaigns', [
            'platform' => 'instagram', 'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/example/',
            'quantity' => 3, 'rules_accepted' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('is_free_reciprocal');
        $this->assertSame(0, ExchangeCampaign::count());
        $this->assertSame(0, ExchangeEscrowEntry::count());
    }

    public function test_same_target_is_blocked_per_account_not_per_user(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $target = $this->account($owner, 'targetdtest');
        $b = $this->account($worker, 'workerbtest');
        $f = $this->account($worker, 'workerftest');

        $first = $this->campaign(
            $owner, $target, 'targetdtest'
        );

        $second = (int) $this->actingAs($owner, 'sanctum')
            ->withHeaders([
                'Idempotency-Key' => 'same-target-second-campaign-test'
            ])
            ->postJson('/api/exchange/campaigns', [
                'platform' => 'instagram',
                'task_type' => 'follow',
                'target_url' => 'https://www.instagram.com/targetdtest/',
                'quantity' => 10,
                'rules_accepted' => true,
                'is_free_reciprocal' => true,
                'social_account_id' => $target,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->assertNotSame($first, $second);

        $this->submit($worker, $first, [$b]);

        $payloadB = [
            'perform_account_ids' => [$b],
            'return_allocations' => [
                ['account_id' => $b, 'quantity' => 1],
            ],
        ];

        $this->actingAs($worker, 'sanctum')
            ->postJson(
                "/api/exchange/reciprocal/{$second}/tick",
                $payloadB
            )
            ->assertUnprocessable();

        $payloadF = [
            'perform_account_ids' => [$f],
            'return_allocations' => [
                ['account_id' => $f, 'quantity' => 1],
            ],
        ];

        $this->actingAs($worker, 'sanctum')
            ->postJson(
                "/api/exchange/reciprocal/{$second}/tick",
                $payloadF
            )
            ->assertOk();

        $this->assertSame(
            1,
            ExchangeTaskClaim::query()
                ->where('campaign_id', $first)
                ->where('social_account_id', $b)
                ->count()
        );

        $this->assertSame(
            1,
            ExchangeTaskClaim::query()
                ->where('campaign_id', $second)
                ->where('social_account_id', $f)
                ->count()
        );

        $this->assertSame(
            0,
            ExchangeTaskClaim::query()
                ->where('campaign_id', $second)
                ->where('social_account_id', $b)
                ->count()
        );
    }


    public function test_available_api_returns_used_accounts_across_campaigns(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $target = $this->account($owner, 'apitargetd');
        $b = $this->account($worker, 'apiworkerb');
        $f = $this->account($worker, 'apiworkerf');

        $first = $this->campaign($owner, $target, 'apitargetd');

        $second = (int) $this->actingAs($owner, 'sanctum')
            ->withHeaders([
                'Idempotency-Key' => 'api-used-accounts-second'
            ])
            ->postJson('/api/exchange/campaigns', [
                'platform' => 'instagram',
                'task_type' => 'follow',
                'target_url' => 'https://www.instagram.com/apitargetd/',
                'quantity' => 10,
                'rules_accepted' => true,
                'is_free_reciprocal' => true,
                'social_account_id' => $target,
            ])
            ->assertCreated()
            ->json('data.id');

        $getAvailable = function () use ($worker, $second): array {
            $response = $this->actingAs($worker, 'sanctum')
                ->getJson('/api/exchange/reciprocal')
                ->assertOk();

            $campaign = collect($response->json('data.available'))
                ->first(fn ($item) => (int) $item['id'] === $second);

            $this->assertNotNull(
                $campaign,
                'Chiến dịch thứ hai phải xuất hiện khi còn tài khoản hợp lệ.'
            );

            return $campaign;
        };

        // Chưa tài khoản nào tương tác.
        $initial = $getAvailable();

        $this->assertSame([], $initial['used_account_ids']);

        // B đã tương tác ở chiến dịch đầu tiên.
        $this->submit($worker, $first, [$b]);

        $afterB = $getAvailable();

        $this->assertContains($b, $afterB['used_account_ids']);
        $this->assertNotContains($f, $afterB['used_account_ids']);

        // F vẫn được phép tương tác cùng đích D.
        $this->submit($worker, $second, [$f]);

        // Kiểm tra cả hai claim được ghi nhận.
        $this->assertDatabaseHas('exchange_task_claims', [
            'campaign_id' => $first,
            'social_account_id' => $b,
        ]);

        $this->assertDatabaseHas('exchange_task_claims', [
            'campaign_id' => $second,
            'social_account_id' => $f,
        ]);

        // Cả B và F đã tương tác: không còn tài khoản hợp lệ.
        $finalResponse = $this->actingAs($worker, 'sanctum')
            ->getJson('/api/exchange/reciprocal')
            ->assertOk();

        $finalCampaign = collect($finalResponse->json('data.available'))
            ->first(fn ($item) => (int) $item['id'] === $second);

        $this->assertNull(
            $finalCampaign,
            'Không được hiển thị chiến dịch khi mọi tài khoản đã tương tác.'
        );
    }

}
