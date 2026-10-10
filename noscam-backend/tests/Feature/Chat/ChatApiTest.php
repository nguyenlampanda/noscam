<?php

namespace Tests\Feature\Chat;

use App\Models\ChatConversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    private function login(string $role = 'user'): User
    {
        $user = User::factory()->create(['role' => $role]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_guest_cannot_access_chat(): void
    {
        $this->getJson('/api/chat/messages')->assertUnauthorized();
        $this->postJson('/api/chat/messages', [
            'body' => 'Hello',
        ])->assertUnauthorized();
        $this->getJson('/api/admin/chat/conversations')
            ->assertUnauthorized();
    }

    public function test_customer_can_send_and_read_own_messages(): void
    {
        $customer = $this->login();

        $this->postJson('/api/chat/messages', [
            'body' => 'Xin chào Admin',
        ])->assertCreated()
          ->assertJsonPath('message.body', 'Xin chào Admin')
          ->assertJsonPath('message.sender_id', $customer->id);

        $this->getJson('/api/chat/messages')
            ->assertOk()
            ->assertJsonCount(1, 'messages')
            ->assertJsonPath('messages.0.body', 'Xin chào Admin');

        $this->assertDatabaseHas('chat_conversations', [
            'customer_id' => $customer->id,
        ]);
    }

    public function test_customers_cannot_read_each_others_messages(): void
    {
        $first = $this->login();

        $this->postJson('/api/chat/messages', [
            'body' => 'Tin nhắn riêng của khách A',
        ])->assertCreated();

        $second = $this->login();

        $this->getJson('/api/chat/messages')
            ->assertOk()
            ->assertJsonCount(0, 'messages');

        $this->postJson('/api/chat/messages', [
            'body' => 'Tin nhắn của khách B',
        ])->assertCreated();

        $this->assertDatabaseCount('chat_conversations', 2);

        Sanctum::actingAs($first);

        $this->getJson('/api/chat/messages')
            ->assertJsonCount(1, 'messages')
            ->assertJsonPath(
                'messages.0.body',
                'Tin nhắn riêng của khách A'
            );
    }

    public function test_admin_can_list_and_reply(): void
    {
        $this->login();

        $this->postJson('/api/chat/messages', [
            'body' => 'Cần hỗ trợ',
        ])->assertCreated();

        $conversation = ChatConversation::firstOrFail();

        $admin = $this->login('admin');

        $this->getJson('/api/admin/chat/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $conversation->id);

        $this->postJson(
            "/api/admin/chat/conversations/{$conversation->id}/messages",
            ['body' => 'Admin đã nhận tin']
        )->assertCreated()
          ->assertJsonPath('message.sender_id', $admin->id);

        $this->getJson(
            "/api/admin/chat/conversations/{$conversation->id}/messages"
        )->assertOk()->assertJsonCount(2, 'messages');
    }

    public function test_moderator_cannot_access_admin_chat(): void
    {
        $this->login('moderator');

        $this->getJson('/api/admin/chat/conversations')
            ->assertForbidden();

        $this->getJson('/api/chat/messages')
            ->assertForbidden();
    }

    public function test_invalid_message_is_rejected(): void
    {
        $this->login();

        $this->postJson('/api/chat/messages', [
            'body' => '',
        ])->assertUnprocessable();

        $this->postJson('/api/chat/messages', [
            'body' => str_repeat('a', 5001),
        ])->assertUnprocessable();

        $this->assertDatabaseCount('chat_messages', 0);
    }

    public function test_customer_marks_admin_message_as_read(): void
    {
        $customer = $this->login();

        $this->postJson('/api/chat/messages', [
            'body' => 'Xin hỗ trợ',
        ])->assertCreated();

        $conversation = ChatConversation::firstOrFail();

        $admin = $this->login('admin');

        $this->postJson(
            "/api/admin/chat/conversations/{$conversation->id}/messages",
            ['body' => 'Admin trả lời']
        )->assertCreated();

        Sanctum::actingAs($customer);

        $this->postJson('/api/chat/read')
            ->assertOk();

        $this->assertDatabaseHas('chat_messages', [
            'conversation_id' => $conversation->id,
            'sender_id' => $admin->id,
            'body' => 'Admin trả lời',
        ]);

        $this->assertNotNull(
            $conversation->messages()
                ->where('sender_id', $admin->id)
                ->firstOrFail()
                ->read_at
        );

        $this->assertNull(
            $conversation->messages()
                ->where('sender_id', $customer->id)
                ->firstOrFail()
                ->read_at
        );
    }
    public function test_admin_unread_counts_only_customer_messages(): void
    {
        $customer = $this->login('user');

        $this->postJson('/api/chat/messages', [
            'body' => 'Khách hàng cần hỗ trợ',
        ])->assertCreated();

        $conversation = ChatConversation::firstOrFail();

        $firstAdmin = $this->login('admin');

        $this->postJson(
            "/api/admin/chat/conversations/{$conversation->id}/messages",
            ['body' => 'Admin thứ nhất trả lời']
        )->assertCreated();

        $this->login('admin');

        $this->getJson('/api/admin/chat/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 1);

        $this->postJson(
            "/api/admin/chat/conversations/{$conversation->id}/read"
        )->assertOk();

        $this->getJson('/api/admin/chat/conversations')
            ->assertJsonPath('data.0.unread_count', 0);

        $this->assertNull(
            $conversation->messages()
                ->where('sender_id', $firstAdmin->id)
                ->firstOrFail()
                ->read_at
        );

        $this->assertNotNull(
            $conversation->messages()
                ->where('sender_id', $customer->id)
                ->firstOrFail()
                ->read_at
        );
    }

}
