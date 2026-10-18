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

class ExchangeClaimCreationTest extends TestCase
{
    use RefreshDatabase;

    private function prepareCampaign(): array
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
            'username' => 'claim_worker',
            'normalized_username' => 'claim_worker',
            'profile_url' => 'https://www.instagram.com/claim_worker/',
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

        return [$owner, $worker, $account, $campaign];
    }

    public function test_worker_can_claim_active_campaign(): void
    {
        [, $worker, $account, $campaign] =
            $this->prepareCampaign();

        $claim = app(ExchangeClaimService::class)
            ->claim($campaign->id, $worker, $account->id);

        $this->assertInstanceOf(
            ExchangeTaskClaim::class,
            $claim
        );

        $this->assertSame('claimed', $claim->status);
        $this->assertEquals($worker->id, $claim->worker_user_id);
        $this->assertEquals($account->id, $claim->social_account_id);
    }

    public function test_owner_cannot_claim_own_campaign(): void
    {
        [$owner, , , $campaign] = $this->prepareCampaign();

        $account = ExchangeSocialAccount::create([
            'user_id' => $owner->id,
            'platform' => 'instagram',
            'username' => 'campaign_owner',
            'normalized_username' => 'campaign_owner',
            'profile_url' => 'https://www.instagram.com/campaign_owner/',
            'is_default' => true,
            'is_active' => true,
        ]);

        $this->expectException(RuntimeException::class);

        app(ExchangeClaimService::class)
            ->claim($campaign->id, $owner, $account->id);
    }

    public function test_worker_cannot_use_another_users_account(): void
    {
        [, , $account, $campaign] = $this->prepareCampaign();

        $otherUser = User::factory()->create();

        $this->expectException(RuntimeException::class);

        app(ExchangeClaimService::class)
            ->claim($campaign->id, $otherUser, $account->id);
    }

    public function test_worker_cannot_claim_twice(): void
    {
        [, $worker, $account, $campaign] =
            $this->prepareCampaign();

        $service = app(ExchangeClaimService::class);

        $service->claim($campaign->id, $worker, $account->id);

        $this->expectException(RuntimeException::class);

        $service->claim($campaign->id, $worker, $account->id);
    }

    public function test_campaign_cannot_exceed_quantity(): void
    {
        [, , , $campaign] = $this->prepareCampaign();

        $service = app(ExchangeClaimService::class);

        for ($i = 1; $i <= 6; $i++) {
            $worker = User::factory()->create();
            $username = 'quantity_worker_' . $i;

            $account = ExchangeSocialAccount::create([
                'user_id' => $worker->id,
                'platform' => 'instagram',
                'username' => $username,
                'normalized_username' => $username,
                'profile_url' => 'https://www.instagram.com/'
                    . $username . '/',
                'is_default' => true,
                'is_active' => true,
            ]);

            if ($i <= 5) {
                $service->claim(
                    $campaign->id,
                    $worker,
                    $account->id
                );
            } else {
                try {
                    $service->claim(
                        $campaign->id,
                        $worker,
                        $account->id
                    );

                    $this->fail(
                        'Không được nhận vượt số lượng.'
                    );
                } catch (RuntimeException $exception) {
                    $this->assertSame(
                        'Chiến dịch đã đủ số lượng nhiệm vụ.',
                        $exception->getMessage()
                    );
                }
            }
        }

        $this->assertSame(
            5,
            ExchangeTaskClaim::where(
                'campaign_id',
                $campaign->id
            )->count()
        );
    }

}
