<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});


// Kênh riêng tư: khách hàng và Admin.
Broadcast::channel('chat.{conversationId}', function ($user, $conversationId) {
    $conversation = \App\Models\ChatConversation::find($conversationId);

    if (!$conversation) {
        return false;
    }

    if ($user->role === 'admin') {
        return true;
    }

    return $user->role === 'user'
        && (int) $conversation->customer_id === (int) $user->id;
}, ['guards' => ['sanctum']]);
