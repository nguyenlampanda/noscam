<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeClaimService;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ExchangeClaimRejectionTest extends TestCase
{
    use RefreshDatabase;

    private function prepareSubmittedClaim(): array
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
            'username' => 'rejection_worker',
            'normalized_username' => 'rejection_worker',
            'profile_url' => 'https://www.instagram.com/rejection_worker/',
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

        return [$owner, $worker, $claim->fresh(), $service];
    }

    public function test_owner_can_reject_with_reason(): void
    {
        [$owner, , $claim, $service] =
            $this->prepareSubmittedClaim();

        $before = now();

        $service->reject(
            $claim->id,
            $owner,
            'Không tìm thấy lượt theo dõi.'
        );

        $updated = $claim->fresh();

        $this->assertSame('rejected', $updated->status);

        $this->assertSame(
            'Không tìm thấy lượt theo dõi.',
            $updated->rejection_reason
        );

        $this->assertNotNull($updated->rejected_at);
        $this->assertNotNull($updated->appeal_deadline_at);

        $this->assertLessThanOrEqual(
            1,
            abs(
                $updated->rejected_at
                    ->copy()->addHours(48)->getTimestamp()
                - $updated->appeal_deadline_at->getTimestamp()
            )
        );

        $this->assertTrue(
            $updated->rejected_at->greaterThanOrEqualTo(
                $before->copy()->startOfSecond()
            )
        );

        $this->assertEquals(
            10000,
            $claim->campaign->fresh()->budget_held
        );
    }

    public function test_other_user_cannot_reject(): void
    {
        [, , $claim, $service] =
            $this->prepareSubmittedClaim();

        $this->expectException(RuntimeException::class);

        $service->reject(
            $claim->id,
            User::factory()->create(),
            'Không hoàn thành.'
        );
    }

    public function test_rejection_requires_reason(): void
    {
        [$owner, , $claim, $service] =
            $this->prepareSubmittedClaim();

        $this->expectException(RuntimeException::class);

        $service->reject($claim->id, $owner, '   ');
    }

    public function test_cannot_reject_after_review_deadline(): void
    {
        [$owner, , $claim, $service] =
            $this->prepareSubmittedClaim();

        $claim->update([
            'review_deadline_at' => now()->subSecond(),
        ]);

        $this->expectException(RuntimeException::class);

        $service->reject(
            $claim->id,
            $owner,
            'Không hoàn thành.'
        );
    }

    public function test_cannot_reject_twice(): void
    {
        [$owner, , $claim, $service] =
            $this->prepareSubmittedClaim();

        $service->reject(
            $claim->id,
            $owner,
            'Không hoàn thành.'
        );

        $this->expectException(RuntimeException::class);

        $service->reject(
            $claim->id,
            $owner,
            'Không hoàn thành.'
        );
    }

    public function test_risk_held_claim_cannot_be_rejected(): void
    {
        [$owner, , $claim, $service] =
            $this->prepareSubmittedClaim();

        $claim->update(['risk_hold' => true]);

        $this->expectException(RuntimeException::class);

        $service->reject(
            $claim->id,
            $owner,
            'Không hoàn thành.'
        );
    }
}
