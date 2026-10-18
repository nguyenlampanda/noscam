<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeSocialAccount;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Exchange\ExchangeClaimService;
use App\Services\Exchange\ExchangeEscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ExchangeClaimSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private function prepareClaim(): array
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
            'username' => 'submission_worker',
            'normalized_username' => 'submission_worker',
            'profile_url' => 'https://www.instagram.com/submission_worker/',
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

        return [$owner, $worker, $account, $claim, $service];
    }

    public function test_worker_can_submit_claim_with_48_hour_deadline(): void
    {
        [, $worker, $account, $claim, $service]
            = $this->prepareClaim();

        $before = now();

        $service->submit($claim->id, $worker);

        $updated = $claim->fresh();

        $this->assertSame('submitted', $updated->status);

        $this->assertSame(
            $account->username,
            $updated->submitted_username
        );

        $this->assertSame(
            $account->profile_url,
            $updated->submitted_profile_url
        );

        $this->assertNotNull($updated->submitted_at);
        $this->assertNotNull($updated->review_deadline_at);

        // Database có thể lưu thời gian với độ chính xác đến giây.
        $expectedDeadline = $updated->submitted_at
            ->copy()
            ->addHours(48);

        $this->assertLessThanOrEqual(
            1,
            abs(
                $expectedDeadline->getTimestamp()
                - $updated->review_deadline_at->getTimestamp()
            )
        );

        $this->assertTrue(
            $updated->submitted_at->greaterThanOrEqualTo(
                $before->copy()->startOfSecond()
            )
        );
    }

    public function test_another_user_cannot_submit_claim(): void
    {
        [, , , $claim, $service] = $this->prepareClaim();

        $otherUser = User::factory()->create();

        $this->expectException(RuntimeException::class);

        $service->submit($claim->id, $otherUser);
    }

    public function test_worker_cannot_submit_twice(): void
    {
        [, $worker, , $claim, $service]
            = $this->prepareClaim();

        $service->submit($claim->id, $worker);

        $this->expectException(RuntimeException::class);

        $service->submit($claim->id, $worker);
    }

    public function test_inactive_social_account_cannot_submit(): void
    {
        [, $worker, $account, $claim, $service]
            = $this->prepareClaim();

        $account->update(['is_active' => false]);

        $this->expectException(RuntimeException::class);

        $service->submit($claim->id, $worker);
    }

    public function test_submitted_identity_is_snapshotted(): void
    {
        [, $worker, $account, $claim, $service]
            = $this->prepareClaim();

        $service->submit($claim->id, $worker);

        $originalUsername = $claim->fresh()->submitted_username;

        $account->update([
            'username' => 'changed_username',
            'normalized_username' => 'changed_username',
            'profile_url' => 'https://www.instagram.com/changed_username/',
        ]);

        $this->assertSame(
            $originalUsername,
            $claim->fresh()->submitted_username
        );
    }
}
