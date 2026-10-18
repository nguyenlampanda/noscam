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

class ExchangeDisputeResolutionTest extends TestCase
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

    public function test_admin_accepts_appeal_and_pays_worker(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();

        app(ExchangeDisputeService::class)->resolve(
            $dispute->id,
            $admin,
            'approve',
            'Bằng chứng hợp lệ.'
        );

        $this->assertSame('settled', $claim->fresh()->status);

        $this->assertEquals(
            1000,
            Wallet::where('user_id', $worker->id)
                ->value('balance')
        );

        $this->assertEquals(
            8000,
            $claim->campaign->fresh()->budget_held
        );

        $this->assertEquals(
            2000,
            $claim->campaign->fresh()->budget_settled
        );

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('claim_id', $claim->id)
                ->where('entry_type', 'reward')
                ->count()
        );

        $this->assertNotNull($dispute->fresh()->resolved_at);
        $this->assertEquals(
            $admin->id,
            $dispute->fresh()->resolved_by
        );
    }

    public function test_admin_rejects_appeal_and_refunds_owner(): void
    {
        [$owner, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();

        app(ExchangeDisputeService::class)->resolve(
            $dispute->id,
            $admin,
            'refund',
            'Bằng chứng không đủ.'
        );

        $this->assertSame('refunded', $claim->fresh()->status);

        $this->assertEquals(
            2000,
            Wallet::where('user_id', $owner->id)
                ->value('balance')
        );

        $this->assertEquals(
            8000,
            $claim->campaign->fresh()->budget_held
        );

        $this->assertEquals(
            2000,
            $claim->campaign->fresh()->budget_refunded
        );

        $this->assertSame(
            1,
            ExchangeEscrowEntry::where('claim_id', $claim->id)
                ->where('entry_type', 'refund')
                ->count()
        );
    }

    public function test_non_admin_cannot_resolve_dispute(): void
    {
        [$owner, , , , $dispute] = $this->prepareDispute();

        $this->expectException(RuntimeException::class);

        app(ExchangeDisputeService::class)->resolve(
            $dispute->id,
            $owner,
            'approve',
            'Tôi muốn tự duyệt.'
        );
    }

    public function test_dispute_cannot_be_resolved_twice(): void
    {
        [, $worker, $admin, $claim, $dispute] =
            $this->prepareDispute();

        $service = app(ExchangeDisputeService::class);

        $service->resolve(
            $dispute->id,
            $admin,
            'approve',
            'Đã kiểm tra.'
        );

        try {
            $service->resolve(
                $dispute->id,
                $admin,
                'refund',
                'Đổi quyết định.'
            );

            $this->fail('Phải từ chối phân xử lần hai.');
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'settled',
                $claim->fresh()->status
            );

            $this->assertEquals(
                1000,
                Wallet::where('user_id', $worker->id)
                    ->value('balance')
            );
        }
    }

    public function test_resolution_requires_reason(): void
    {
        [, , $admin, , $dispute] =
            $this->prepareDispute();

        $this->expectException(RuntimeException::class);

        app(ExchangeDisputeService::class)->resolve(
            $dispute->id,
            $admin,
            'approve',
            '   '
        );
    }
}
