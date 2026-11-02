<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExchangeFreeIdempotencyTest extends TestCase
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

    private function payload(int $accountId, string $handle, int $quantity = 10): array
    {
        return [
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => "https://www.instagram.com/{$handle}/",
            'quantity' => $quantity,
            'rules_accepted' => true,
            'is_free_reciprocal' => true,
            'social_account_id' => $accountId,
        ];
    }

    private function createCampaign(User $user, string $key, array $payload)
    {
        return $this->actingAs($user, 'sanctum')
            ->withHeaders(['Idempotency-Key' => $key])
            ->postJson('/api/exchange/campaigns', $payload);
    }

    public function test_same_key_does_not_create_duplicate(): void
    {
        $owner = User::factory()->create();
        $account = $this->account($owner, 'freeidemowner');

        $payload = $this->payload($account, 'freeidemowner');
        $key = 'free-idempotency-test-001';

        $first = $this->createCampaign($owner, $key, $payload)
            ->assertCreated();

        $second = $this->createCampaign($owner, $key, $payload)
            ->assertCreated();

        $this->assertSame(
            $first->json('data.id'),
            $second->json('data.id')
        );

        $this->assertSame(1, ExchangeCampaign::count());
        $this->assertSame(0, ExchangeEscrowEntry::count());
    }

    public function test_same_key_different_payload_is_rejected(): void
    {
        $owner = User::factory()->create();
        $account = $this->account($owner, 'freeidemconflict');

        $key = 'free-idempotency-conflict-001';

        $this->createCampaign(
            $owner,
            $key,
            $this->payload($account, 'freeidemconflict', 10)
        )->assertCreated();

        $this->createCampaign(
            $owner,
            $key,
            $this->payload($account, 'freeidemconflict', 20)
        )->assertStatus(409)
         ->assertJsonValidationErrors('idempotency_key');

        $this->assertSame(1, ExchangeCampaign::count());
        $this->assertSame(0, ExchangeEscrowEntry::count());
    }

    public function test_different_users_can_use_same_key(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $firstAccount = $this->account($firstUser, 'freeidemfirst');
        $secondAccount = $this->account($secondUser, 'freeidemsecond');

        $key = 'free-idempotency-shared-001';

        $this->createCampaign(
            $firstUser,
            $key,
            $this->payload($firstAccount, 'freeidemfirst')
        )->assertCreated();

        $this->createCampaign(
            $secondUser,
            $key,
            $this->payload($secondAccount, 'freeidemsecond')
        )->assertCreated();

        $this->assertSame(2, ExchangeCampaign::count());
        $this->assertSame(0, ExchangeEscrowEntry::count());
    }

    public function test_missing_key_is_rejected(): void
    {
        $owner = User::factory()->create();
        $account = $this->account($owner, 'freeidemmissing');

        $this->actingAs($owner, 'sanctum')
            ->postJson(
                '/api/exchange/campaigns',
                $this->payload($account, 'freeidemmissing')
            )->assertUnprocessable()
             ->assertJsonValidationErrors('idempotency_key');

        $this->assertSame(0, ExchangeCampaign::count());
    }
}
