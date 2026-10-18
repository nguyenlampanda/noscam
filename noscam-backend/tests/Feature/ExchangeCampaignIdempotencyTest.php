<?php

namespace Tests\Feature;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeEscrowEntry;
use App\Models\ExchangeTaskPrice;
use App\Models\User;
use App\Services\Social\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExchangeCampaignIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private function prepareOwner(): User
    {
        $owner = User::factory()->create();

        app(WalletService::class)->credit(
            $owner, 20000, 'adjustment'
        );

        return $owner;
    }

    private function preparePrice(): void
    {
        ExchangeTaskPrice::firstOrCreate(
            [
                'platform' => 'instagram',
                'task_type' => 'follow',
            ],
            [
                'cost_per_task' => 2000,
                'reward_per_task' => 1000,
                'min_quantity' => 3,
                'is_enabled' => true,
            ]
        );
    }

    private function payload(int $quantity = 3): array
    {
        return [
            'platform' => 'instagram',
            'task_type' => 'follow',
            'target_url' => 'https://www.instagram.com/example/',
            'quantity' => $quantity,
            'rules_accepted' => true,
        ];
    }

    private function createWithKey(string $key, array $payload)
    {
        return $this->withHeaders([
            'Idempotency-Key' => $key,
        ])->postJson('/api/exchange/campaigns', $payload);
    }

    public function test_missing_idempotency_key_is_rejected(): void
    {
        $this->preparePrice();
        $owner = $this->prepareOwner();

        Sanctum::actingAs($owner);

        $this->postJson(
            '/api/exchange/campaigns',
            $this->payload()
        )->assertUnprocessable()
         ->assertJsonValidationErrors('idempotency_key');

        $this->assertSame(0, ExchangeCampaign::count());
        $this->assertEquals(
            20000,
            app(WalletService::class)
                ->getOrCreate($owner)->fresh()->balance
        );
    }

    public function test_new_key_creates_one_campaign(): void
    {
        $this->preparePrice();
        $owner = $this->prepareOwner();

        Sanctum::actingAs($owner);

        $this->createWithKey(
            'exchange-new-key-366',
            $this->payload()
        )->assertCreated();

        $this->assertSame(1, ExchangeCampaign::count());
        $this->assertSame(1, ExchangeEscrowEntry::where(
            'entry_type', 'hold'
        )->count());

        $this->assertEquals(
            14000,
            app(WalletService::class)
                ->getOrCreate($owner)->fresh()->balance
        );
    }

    public function test_repeated_key_does_not_charge_twice(): void
    {
        $this->preparePrice();
        $owner = $this->prepareOwner();

        Sanctum::actingAs($owner);

        $first = $this->createWithKey(
            'exchange-repeat-key-367',
            $this->payload()
        )->assertCreated();

        $second = $this->createWithKey(
            'exchange-repeat-key-367',
            $this->payload()
        )->assertSuccessful();

        $this->assertSame(
            $first->json('data.id'),
            $second->json('data.id')
        );

        $this->assertSame(1, ExchangeCampaign::count());
        $this->assertSame(1, ExchangeEscrowEntry::where(
            'entry_type', 'hold'
        )->count());

        $this->assertEquals(
            14000,
            app(WalletService::class)
                ->getOrCreate($owner)->fresh()->balance
        );
    }

    public function test_same_key_with_different_payload_is_rejected(): void
    {
        $this->preparePrice();
        $owner = $this->prepareOwner();

        Sanctum::actingAs($owner);

        $this->createWithKey(
            'exchange-conflict-key-368',
            $this->payload(3)
        )->assertCreated();

        $this->createWithKey(
            'exchange-conflict-key-368',
            $this->payload(4)
        )->assertStatus(409)
         ->assertJsonValidationErrors('idempotency_key');

        $this->assertSame(1, ExchangeCampaign::count());

        $this->assertEquals(
            14000,
            app(WalletService::class)
                ->getOrCreate($owner)->fresh()->balance
        );
    }

    public function test_different_users_can_use_same_key(): void
    {
        $this->preparePrice();

        $firstOwner = $this->prepareOwner();
        $secondOwner = $this->prepareOwner();

        Sanctum::actingAs($firstOwner);

        $this->createWithKey(
            'exchange-shared-key-369',
            $this->payload()
        )->assertCreated();

        Sanctum::actingAs($secondOwner);

        $this->createWithKey(
            'exchange-shared-key-369',
            $this->payload()
        )->assertCreated();

        $this->assertSame(2, ExchangeCampaign::count());

        $this->assertEquals(
            14000,
            app(WalletService::class)
                ->getOrCreate($firstOwner)->fresh()->balance
        );

        $this->assertEquals(
            14000,
            app(WalletService::class)
                ->getOrCreate($secondOwner)->fresh()->balance
        );
    }
}
