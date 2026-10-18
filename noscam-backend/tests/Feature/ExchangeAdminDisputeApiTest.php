<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskDispute;
use App\Models\ExchangeEscrowEntry;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeClaimService;
use App\Services\Exchange\ExchangeDisputeService;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;
use Laravel\Sanctum\Sanctum;

class ExchangeAdminDisputeApiTest extends TestCase
{
    use RefreshDatabase;

    private function prepareDispute(): array
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        Wallet::create([
            'user_id' => $owner->id,
            'balance' => 10000,
            'total_deposited' => 0,
            'total_spent' => 0,
            'total_refunded' => 0,
            'currency' => 'VND',
        ]);

        $account = ExchangeSocialAccount::create([
            'user_id' => $worker->id,
            'platform' => 'instagram',
            'username' => 'dispute_worker',
            'normalized_username' => 'dispute_worker',
            'profile_url' => 'https://www.instagram.com/dispute_worker/',
            'is_default' => true,
            'is_active' => true,
        ]);

        $campaign = ExchangeCampaign::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/target/',
            'quantity' => 5,
            'cost_per_task' => 2000,
            'reward_per_task' => 1000,
            'budget_total' => 10000,
            'budget_held' => 0,
            'budget_settled' => 0,
            'budget_refunded' => 0,
            'status' => 'draft',
            'rules_accepted' => true,
            'rules_accepted_at' => now(),
        ]);

        app(ExchangeEscrowService::class)
            ->holdCampaignBudget($campaign);

        $claimService = app(ExchangeClaimService::class);

        $claim = $claimService->claim(
            $campaign->id,
            $worker,
            $account->id
        );

        $claimService->submit($claim->id, $worker);

        $claimService->reject(
            $claim->id,
            $owner,
            'Không tìm thấy lượt theo dõi.'
        );

        $claimService->appeal(
            $claim->id,
            $worker,
            'Tôi đã hoàn thành nhiệm vụ.'
        );

        $dispute = ExchangeTaskDispute::where(
            'claim_id',
            $claim->id
        )->firstOrFail();

        return [
            $owner,
            $worker,
            $admin,
            $claim->fresh(),
            $dispute,
        ];
    }


    private function resolveUrl($dispute): string
    {
        return '/api/admin/exchange/disputes/'
            .$dispute->id.'/resolve';
    }

    public function test_guest_cannot_resolve_dispute(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();
        $campaign = \App\Models\ExchangeCampaign::findOrFail($claim->campaign_id);

        auth()->forgetGuards();

        $this->postJson($this->resolveUrl($dispute), [
            'decision' => 'approve',
            'reason' => 'Đã xác minh.',
        ])->assertUnauthorized();

        $this->assertSame('pending', $dispute->fresh()->status);
    }

    public function test_admin_approves_and_pays_worker(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();
        $campaign = \App\Models\ExchangeCampaign::findOrFail($claim->campaign_id);

        Sanctum::actingAs($admin);

        $this->postJson($this->resolveUrl($dispute), [
            'decision' => 'approve',
            'reason' => 'Đã xác minh nhiệm vụ.',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'approved')
            ->assertJsonPath('admin_reason', 'Đã xác minh nhiệm vụ.')
            ->assertJsonMissingPath('evidence');

        $this->assertSame('settled', $claim->fresh()->status);
        $this->assertEquals(1000, $worker->wallet()->first()->balance);
        $this->assertEquals(8000, $campaign->fresh()->budget_held);
        $this->assertEquals(2000, $campaign->fresh()->budget_settled);
        $this->assertEquals(0, $campaign->fresh()->budget_refunded);
    }

    public function test_admin_refunds_owner(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();
        $campaign = \App\Models\ExchangeCampaign::findOrFail($claim->campaign_id);

        Sanctum::actingAs($admin);

        $this->postJson($this->resolveUrl($dispute), [
            'decision' => 'refund',
            'reason' => 'Không đủ bằng chứng.',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'rejected');

        $this->assertSame('refunded', $claim->fresh()->status);
        $this->assertEquals(2000, $owner->wallet()->first()->balance);
        $this->assertEquals(8000, $campaign->fresh()->budget_held);
        $this->assertEquals(2000, $campaign->fresh()->budget_refunded);
        $this->assertEquals(0, $campaign->fresh()->budget_settled);
    }

    public function test_regular_user_cannot_resolve(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();
        $campaign = \App\Models\ExchangeCampaign::findOrFail($claim->campaign_id);

        Sanctum::actingAs($worker);

        $this->postJson($this->resolveUrl($dispute), [
            'decision' => 'approve',
            'reason' => 'Không có quyền.',
        ])->assertForbidden();

        $this->assertSame('pending', $dispute->fresh()->status);
    }

    public function test_moderator_cannot_resolve(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();
        $campaign = \App\Models\ExchangeCampaign::findOrFail($claim->campaign_id);

        $moderator = \App\Models\User::factory()->create([
            'role' => 'moderator',
        ]);

        Sanctum::actingAs($moderator);

        $this->postJson($this->resolveUrl($dispute), [
            'decision' => 'approve',
            'reason' => 'Không có quyền admin.',
        ])->assertForbidden();

        $this->assertSame('pending', $dispute->fresh()->status);
    }

    public function test_decision_and_reason_are_required(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();
        $campaign = \App\Models\ExchangeCampaign::findOrFail($claim->campaign_id);

        Sanctum::actingAs($admin);

        $this->postJson($this->resolveUrl($dispute), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['decision', 'reason']);

        $this->postJson($this->resolveUrl($dispute), [
            'decision' => 'invalid',
            'reason' => 'Kiểm tra.',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['decision']);

        $this->assertSame('pending', $dispute->fresh()->status);
    }

    public function test_dispute_cannot_be_resolved_twice(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();
        $campaign = \App\Models\ExchangeCampaign::findOrFail($claim->campaign_id);

        Sanctum::actingAs($admin);

        $url = $this->resolveUrl($dispute);

        $this->postJson($url, [
            'decision' => 'approve',
            'reason' => 'Chấp thuận.',
        ])->assertOk();

        $this->postJson($url, [
            'decision' => 'refund',
            'reason' => 'Thử hoàn tiền lần hai.',
        ])->assertUnprocessable();

        $this->assertSame('settled', $claim->fresh()->status);
        $this->assertSame('approved', $dispute->fresh()->status);
        $this->assertEquals(1000, $worker->wallet()->first()->balance);
        $this->assertEquals(0, $campaign->fresh()->budget_refunded);
    }
}
