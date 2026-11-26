<?php

namespace Tests\Feature\Chat;

use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatImageTest extends TestCase
{
    use RefreshDatabase;

    private function login(string $role = 'user'): User
    {
        $user = User::factory()->create(['role' => $role]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_customer_can_send_image_without_text(): void
    {
        Storage::fake('local');
        $this->login();

        $response = $this->post('/api/chat/messages', [
            'image' => UploadedFile::fake()->image('receipt.png'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('message.has_image', true)
            ->assertJsonPath('message.body', '')
            ->assertJsonMissingPath('message.image_path');

        $message = ChatMessage::findOrFail(
            $response->json('message.id')
        );

        Storage::disk('local')->assertExists($message->image_path);

        $this->get("/api/chat/messages/{$message->id}/image")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_customer_can_send_image_with_text(): void
    {
        Storage::fake('local');
        $this->login();

        $this->post('/api/chat/messages', [
            'body' => 'Admin kiem tra giup minh',
            'image' => UploadedFile::fake()->image('receipt.jpg'),
        ])->assertCreated()
          ->assertJsonPath('message.has_image', true)
          ->assertJsonPath('message.body', 'Admin kiem tra giup minh');
    }

    public function test_other_customer_cannot_view_private_image(): void
    {
        Storage::fake('local');
        $this->login();

        $response = $this->post('/api/chat/messages', [
            'image' => UploadedFile::fake()->image('private.png'),
        ])->assertCreated();

        $id = $response->json('message.id');

        $this->login();

        $this->getJson("/api/chat/messages/{$id}/image")
            ->assertNotFound();

        $this->getJson("/api/admin/chat/messages/{$id}/image")
            ->assertForbidden();
    }

    public function test_admin_can_view_and_send_image(): void
    {
        Storage::fake('local');
        $customer = $this->login();

        $response = $this->post('/api/chat/messages', [
            'image' => UploadedFile::fake()->image('customer.png'),
        ])->assertCreated();

        $id = $response->json('message.id');
        $conversation = $response->json('message.conversation_id');

        $this->login('admin');

        $this->get("/api/admin/chat/messages/{$id}/image")
            ->assertOk();

        $reply = $this->post(
            "/api/admin/chat/conversations/{$conversation}/messages",
            [
                'image' => UploadedFile::fake()->image('reply.png'),
            ]
        )->assertCreated()
         ->assertJsonPath('message.has_image', true);

        $replyId = $reply->json('message.id');

        Sanctum::actingAs($customer);

        $this->get("/api/chat/messages/{$replyId}/image")
            ->assertOk();
    }

    public function test_guest_cannot_view_image(): void
    {
        $this->getJson('/api/chat/messages/1/image')
            ->assertUnauthorized();

        $this->getJson('/api/admin/chat/messages/1/image')
            ->assertUnauthorized();
    }

    public function test_invalid_file_is_rejected(): void
    {
        Storage::fake('local');
        $this->login();

        $this->post('/api/chat/messages', [
            'image' => UploadedFile::fake()->create(
                'document.pdf', 100, 'application/pdf'
            ),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable();

        $this->assertDatabaseCount('chat_messages', 0);
    }

    public function test_oversized_image_is_rejected(): void
    {
        Storage::fake('local');
        $this->login();

        $this->post('/api/chat/messages', [
            'image' => UploadedFile::fake()
                ->image('large.png')
                ->size(10241),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable();

        $this->assertDatabaseCount('chat_messages', 0);
    }

    public function test_text_only_message_still_works(): void
    {
        $this->login();

        $this->postJson('/api/chat/messages', [
            'body' => 'Hello Admin',
        ])->assertCreated()
          ->assertJsonPath('message.has_image', false);

        $this->getJson('/api/chat/messages')
            ->assertOk()
            ->assertJsonPath('messages.0.body', 'Hello Admin');
    }
}
