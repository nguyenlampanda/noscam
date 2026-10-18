<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskDispute;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeClaimService;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ExchangeClaimAppealTest extends TestCase
{
    use RefreshDatabase;

    private function prepareRejectedClaim(): array
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

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
            'username' => 'appeal_worker',
            'normalized_username' => 'appeal_worker',
            'profile_url' => 'https://www.instagram.com/appeal_worker/',
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

        $service = app(ExchangeClaimService::class);

        $claim = $service->claim(
            $campaign->id,
            $worker,
            $account->id
        );

        $service->submit($claim->id, $worker);

        $service->reject(
            $claim->id,
            $owner,
            'Không tìm thấy lượt theo dõi.'
        );

        return [$owner, $worker, $claim->fresh(), $service];
    }

    public function test_worker_can_appeal_rejection(): void
    {
        [, $worker, $claim, $service] =
            $this->prepareRejectedClaim();

        $service->appeal(
            $claim->id,
            $worker,
            'Tôi đã theo dõi tài khoản đúng yêu cầu.'
        );

        $this->assertSame(
            'disputed',
            $claim->fresh()->status
        );

        $dispute = ExchangeTaskDispute::where(
            'claim_id',
            $claim->id
        )->first();

        $this->assertNotNull($dispute);
        $this->assertEquals($worker->id, $dispute->opened_by);
        $this->assertSame('pending', $dispute->status);

        $this->assertSame(
            'Tôi đã theo dõi tài khoản đúng yêu cầu.',
            $dispute->appeal_reason
        );

        $this->assertEquals(
            10000,
            $claim->campaign->fresh()->budget_held
        );
    }

    public function test_another_user_cannot_appeal(): void
    {
        [, , $claim, $service] =
            $this->prepareRejectedClaim();

        $this->expectException(RuntimeException::class);

        $service->appeal(
            $claim->id,
            User::factory()->create(),
            'Tôi muốn khiếu nại.'
        );
    }

    public function test_appeal_requires_reason(): void
    {
        [, $worker, $claim, $service] =
            $this->prepareRejectedClaim();

        $this->expectException(RuntimeException::class);

        $service->appeal($claim->id, $worker, '   ');
    }

    public function test_cannot_appeal_after_deadline(): void
    {
        [, $worker, $claim, $service] =
            $this->prepareRejectedClaim();

        $claim->update([
            'appeal_deadline_at' => now()->subSecond(),
        ]);

        $this->expectException(RuntimeException::class);

        $service->appeal(
            $claim->id,
            $worker,
            'Tôi đã hoàn thành nhiệm vụ.'
        );
    }

    public function test_cannot_appeal_twice(): void
    {
        [, $worker, $claim, $service] =
            $this->prepareRejectedClaim();

        $service->appeal(
            $claim->id,
            $worker,
            'Tôi đã hoàn thành nhiệm vụ.'
        );

        $this->expectException(RuntimeException::class);

        $service->appeal(
            $claim->id,
            $worker,
            'Tôi muốn khiếu nại lần nữa.'
        );
    }

    public function test_appeal_cannot_create_duplicate_dispute(): void
    {
        [, $worker, $claim, $service] =
            $this->prepareRejectedClaim();

        $service->appeal(
            $claim->id,
            $worker,
            'Tôi đã hoàn thành nhiệm vụ.'
        );

        try {
            $service->appeal(
                $claim->id,
                $worker,
                'Khiếu nại lần hai.'
            );
        } catch (RuntimeException $exception) {
            // Kỳ vọng hệ thống từ chối lần hai.
        }

        $this->assertSame(
            1,
            ExchangeTaskDispute::where(
                'claim_id',
                $claim->id
            )->count()
        );
    }
}
