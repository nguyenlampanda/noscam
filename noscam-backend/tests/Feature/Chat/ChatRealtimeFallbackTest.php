<?php

namespace Tests\Feature\Chat;

use App\Events\ChatMessageSent;
use App\Models\ChatConversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatRealtimeFallbackTest extends TestCase
{
    use RefreshDatabase;

    private function simulateRealtimeFailure(): void
    {
        Event::listen(
            ChatMessageSent::class,
            function () {
                throw new \RuntimeException(
                    'Simulated realtime connection failure'
                );
            }
        );
    }

    public function test_customer_image_survives_realtime_failure(): void
    {
        Storage::fake('local');

        $customer = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($customer);

        $this->simulateRealtimeFailure();

        $response = $this->post('/api/chat/messages', [
            'body' => 'Realtime fallback test',
            'image' => UploadedFile::fake()->image('test.png'),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('message.has_image', true);

        $this->assertDatabaseCount('chat_messages', 1);

        $message = \App\Models\ChatMessage::findOrFail(
            $response->json('message.id')
        );

        Storage::disk('local')->assertExists($message->image_path);
    }

    public function test_admin_reply_survives_realtime_failure(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);

        $conversation = ChatConversation::firstOrCreate([
            'customer_id' => $customer->id,
        ]);

        Sanctum::actingAs($admin);

        $this->simulateRealtimeFailure();

        $this->postJson(
            "/api/admin/chat/conversations/{$conversation->id}/messages",
            ['body' => 'Admin fallback test']
        )->assertCreated();

        $this->assertDatabaseCount('chat_messages', 1);

        $this->assertDatabaseHas('chat_messages', [
            'conversation_id' => $conversation->id,
            'sender_id' => $admin->id,
            'body' => 'Admin fallback test',
        ]);
    }
}
