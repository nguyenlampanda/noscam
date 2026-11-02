<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExchangeAutoReturnTest extends TestCase
{
    use RefreshDatabase;

    public function test_approved_work_creates_exactly_one_return_slot_without_coins(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $ownerAccount = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'autoreturnowner',
            ])->assertCreated()->json('data.id');

        $workerAccount = $this->actingAs($worker, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'autoreturnworker',
            ])->assertCreated()->json('data.id');

        $campaignId = $this->actingAs($owner, 'sanctum')
            ->withHeaders(['Idempotency-Key' => 'auto-return-test-owner-001'])
            ->postJson('/api/exchange/campaigns', [
                'platform' => 'instagram',
                'task_type' => 'follow',
                'target_url' => 'https://www.instagram.com/autoreturnowner/',
                'quantity' => 10,
                'rules_accepted' => true,
                'is_free_reciprocal' => true,
                'social_account_id' => $ownerAccount,
            ])->assertCreated()->json('data.id');

        $this->actingAs($worker, 'sanctum')
            ->postJson("/api/exchange/reciprocal/{$campaignId}/tick", [
                'perform_account_ids' => [$workerAccount],
                'return_allocations' => [
                    [
                        'account_id' => $workerAccount,
                        'quantity' => 1,
                    ],
                ],
            ])->assertOk();

        $claim = ExchangeTaskClaim::where('campaign_id', $campaignId)
            ->firstOrFail();

        $this->assertNotNull($claim->return_campaign_id);

        $returnCampaign = ExchangeCampaign::findOrFail(
            $claim->return_campaign_id
        );

        $this->assertSame((int) $worker->id, (int) $returnCampaign->user_id);
        $this->assertSame(0, (int) $returnCampaign->quantity);
        $this->assertSame('paused', $returnCampaign->status);

        $this->actingAs($owner, 'sanctum')
            ->postJson(
                "/api/exchange/reciprocal/claims/{$claim->id}/return",
                [
                    'decision' => 'approve',
                    'return_account_id' => $ownerAccount,
                ]
            )->assertOk();

        $returnCampaign->refresh();

        $this->assertSame(1, (int) $returnCampaign->quantity);
        $this->assertSame('active', $returnCampaign->status);
        $this->assertSame(0, ExchangeEscrowEntry::count());

        $this->actingAs($owner, 'sanctum')
            ->postJson(
                "/api/exchange/reciprocal/claims/{$claim->id}/return",
                [
                    'decision' => 'approve',
                    'return_account_id' => $ownerAccount,
                ]
            )->assertUnprocessable();

        $this->assertSame(
            1,
            (int) $returnCampaign->fresh()->quantity
        );
        $this->assertSame(0, ExchangeEscrowEntry::count());
    }

    public function test_rejected_work_does_not_unlock_return_slot(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $ownerAccount = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'rejectautoowner',
            ])->assertCreated()->json('data.id');

        $workerAccount = $this->actingAs($worker, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => 'rejectautoworker',
            ])->assertCreated()->json('data.id');

        $campaignId = $this->actingAs($owner, 'sanctum')
            ->withHeaders(['Idempotency-Key' => 'reject-auto-return-owner-001'])
            ->postJson('/api/exchange/campaigns', [
                'platform' => 'instagram',
                'task_type' => 'follow',
                'target_url' => 'https://www.instagram.com/rejectautoowner/',
                'quantity' => 10,
                'rules_accepted' => true,
                'is_free_reciprocal' => true,
                'social_account_id' => $ownerAccount,
            ])->assertCreated()->json('data.id');

        $this->actingAs($worker, 'sanctum')
            ->postJson("/api/exchange/reciprocal/{$campaignId}/tick", [
                'perform_account_ids' => [$workerAccount],
                'return_allocations' => [
                    ['account_id' => $workerAccount, 'quantity' => 1],
                ],
            ])->assertOk();

        $claim = ExchangeTaskClaim::where('campaign_id', $campaignId)
            ->firstOrFail();

        $this->assertNotNull($claim->return_campaign_id);

        $returnCampaign = ExchangeCampaign::findOrFail(
            $claim->return_campaign_id
        );

        $this->assertSame(0, (int) $returnCampaign->quantity);

        $this->actingAs($owner, 'sanctum')
            ->postJson(
                "/api/exchange/reciprocal/claims/{$claim->id}/return",
                ['decision' => 'reject']
            )->assertOk();

        $this->assertSame(
            0,
            (int) $returnCampaign->fresh()->quantity
        );

        $this->assertSame('paused', $returnCampaign->fresh()->status);
        $this->assertSame(0, ExchangeEscrowEntry::count());
    }


    public function test_multiple_accounts_receive_correct_allocations(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $makeAccount = function ($user, $handle) {
            return (int) $this->actingAs($user, 'sanctum')
                ->postJson('/api/exchange/accounts', [
                    'platform' => 'instagram',
                    'account' => $handle,
                ])->assertCreated()->json('data.id');
        };

        $ownerAccount = $makeAccount($owner, 'multiowner');
        $workerA = $makeAccount($worker, 'multiworkera');
        $workerB = $makeAccount($worker, 'multiworkerb');

        $campaignId = $this->actingAs($owner, 'sanctum')
            ->withHeaders(['Idempotency-Key' => 'multi-return-owner-test-001'])
            ->postJson('/api/exchange/campaigns', [
                'platform' => 'instagram',
                'task_type' => 'follow',
                'target_url' => 'https://www.instagram.com/multiowner/',
                'quantity' => 10,
                'rules_accepted' => true,
                'is_free_reciprocal' => true,
                'social_account_id' => $ownerAccount,
            ])->assertCreated()->json('data.id');

        $this->actingAs($worker, 'sanctum')
            ->postJson("/api/exchange/reciprocal/{$campaignId}/tick", [
                'perform_account_ids' => [$workerA, $workerB],
                'return_allocations' => [
                    ['account_id' => $workerA, 'quantity' => 1],
                    ['account_id' => $workerB, 'quantity' => 1],
                ],
            ])->assertOk();

        $claims = ExchangeTaskClaim::where('campaign_id', $campaignId)
            ->orderBy('id')->get();

        $this->assertCount(2, $claims);

        $returnIds = $claims->pluck('return_campaign_id')->all();

        $this->assertNotContains(null, $returnIds);
        $this->assertCount(2, array_unique($returnIds));

        foreach ($claims as $claim) {
            $this->actingAs($owner, 'sanctum')
                ->postJson(
                    "/api/exchange/reciprocal/claims/{$claim->id}/return",
                    [
                        'decision' => 'approve',
                        'return_account_id' => $ownerAccount,
                    ]
                )->assertOk();
        }

        $returns = ExchangeCampaign::whereIn('id', $returnIds)->get();

        $this->assertCount(2, $returns);
        $this->assertEqualsCanonicalizing(
            [$workerA, $workerB],
            $returns->pluck('social_account_id')->all()
        );

        foreach ($returns as $campaign) {
            $this->assertSame(1, (int) $campaign->quantity);
            $this->assertSame('active', $campaign->status);
            $this->assertSame(0, (int) $campaign->budget_total);
        }

        $this->assertSame(0, ExchangeEscrowEntry::count());
    }

}
