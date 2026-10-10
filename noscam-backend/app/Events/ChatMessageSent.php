<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;

    public int $conversationId;

    public function __construct(ChatMessage $chatMessage)
    {
        $this->conversationId = (int) $chatMessage->conversation_id;

        $this->message = [
            'id' => $chatMessage->id,
            'conversation_id' => $chatMessage->conversation_id,
            'sender_id' => $chatMessage->sender_id,
            'body' => $chatMessage->body,
            'created_at' => $chatMessage->created_at?->toISOString(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('chat.'.$this->conversationId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'chat.message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
        ];
    }
}
