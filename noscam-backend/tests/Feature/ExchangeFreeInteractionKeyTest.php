<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeTaskClaim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ExchangeFreeInteractionKeyTest extends TestCase
{
    use RefreshDatabase;

    private function account(User $user, string $handle): int
    {
        return (int) $this->actingAs($user, 'sanctum')
            ->postJson('/api/exchange/accounts', [
                'platform' => 'instagram',
                'account' => $handle,
            ])->assertCreated()->json('data.id');
    }

    private function campaign(
        User $owner,
        int $accountId,
        string $handle,
        string $idempotencyKey
    ): int {
        return (int) $this->actingAs($owner, 'sanctum')
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->postJson('/api/exchange/campaigns', [
                'platform' => 'instagram',
                'task_type' => 'follow',
                'target_url' => "https://www.instagram.com/{$handle}/",
                'quantity' => 10,
                'rules_accepted' => true,
                'is_free_reciprocal' => true,
                'social_account_id' => $accountId,
            ])->assertCreated()->json('data.id');
    }

    private function submit(
        User $worker,
        int $campaignId,
        array $ids
    ) {
        return $this->actingAs($worker, 'sanctum')
            ->postJson("/api/exchange/reciprocal/{$campaignId}/tick", [
                'perform_account_ids' => $ids,
                'return_allocations' => [
                    [
                        'account_id' => $ids[0],
                        'quantity' => count($ids),
                    ],
                ],
            ]);
    }

    public function test_successful_claim_creates_linked_unique_key(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $target = $this->account($owner, 'keytargetone');
        $performer = $this->account($worker, 'keyworkerone');

        $campaign = $this->campaign(
            $owner,
            $target,
            'keytargetone',
            'free-interaction-key-test-one-2026'
        );

        $this->submit($worker, $campaign, [$performer])->assertOk();

        $claim = ExchangeTaskClaim::where('campaign_id', $campaign)
            ->firstOrFail();

        $expectedKey = 'instagram|follow|instagram.com/keytargetone';

        $this->assertDatabaseHas('exchange_free_interaction_keys', [
            'social_account_id' => $performer,
            'claim_id' => $claim->id,
            'target_hash' => hash('sha256', $expectedKey),
        ]);

        $this->assertSame(
            1,
            DB::table('exchange_free_interaction_keys')->count()
        );
    }

    public function test_database_unique_constraint_rejects_duplicate_key(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $target = $this->account($owner, 'keytargettwo');
        $performer = $this->account($worker, 'keyworkertwo');

        $campaign = $this->campaign(
            $owner,
            $target,
            'keytargettwo',
            'free-interaction-key-test-two-2026'
        );

        $this->submit($worker, $campaign, [$performer])->assertOk();

        $claim = ExchangeTaskClaim::where('campaign_id', $campaign)
            ->firstOrFail();

        $existing = DB::table('exchange_free_interaction_keys')
            ->where('claim_id', $claim->id)
            ->first();

        $this->assertNotNull($existing);

        $failed = false;

        try {
            DB::table('exchange_free_interaction_keys')->insert([
                'social_account_id' => $performer,
                'claim_id' => $claim->id,
                'target_hash' => $existing->target_hash,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (
            \Illuminate\Database\UniqueConstraintViolationException $e
        ) {
            $failed = true;
        }

        $this->assertTrue(
            $failed,
            'Database phải từ chối khóa trùng.'
        );

        $this->assertSame(
            1,
            DB::table('exchange_free_interaction_keys')->count()
        );
    }

    public function test_mixed_batch_rolls_back_when_one_account_was_used(): void
    {
        $owner = User::factory()->create();
        $worker = User::factory()->create();

        $target = $this->account($owner, 'keytargetthree');
        $used = $this->account($worker, 'keyworkerused');
        $fresh = $this->account($worker, 'keyworkerfresh');

        $first = $this->campaign(
            $owner,
            $target,
            'keytargetthree',
            'free-interaction-key-test-three-a-2026'
        );

        $second = $this->campaign(
            $owner,
            $target,
            'keytargetthree',
            'free-interaction-key-test-three-b-2026'
        );

        $this->submit($worker, $first, [$used])->assertOk();

        $claimsBefore = ExchangeTaskClaim::count();
        $keysBefore = DB::table('exchange_free_interaction_keys')->count();
        $campaignsBefore = ExchangeCampaign::count();

        $this->submit($worker, $second, [$fresh, $used])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('interaction');

        $this->assertSame(
            $claimsBefore,
            ExchangeTaskClaim::count()
        );

        $this->assertSame(
            $keysBefore,
            DB::table('exchange_free_interaction_keys')->count()
        );

        $this->assertSame(
            $campaignsBefore,
            ExchangeCampaign::count()
        );

        $this->assertDatabaseMissing('exchange_task_claims', [
            'campaign_id' => $second,
            'social_account_id' => $fresh,
        ]);

        $this->submit($worker, $second, [$fresh])->assertOk();

        $this->assertSame(
            $keysBefore + 1,
            DB::table('exchange_free_interaction_keys')->count()
        );
    }
}
