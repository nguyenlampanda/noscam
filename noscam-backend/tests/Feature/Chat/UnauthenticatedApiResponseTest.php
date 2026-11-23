<?php

namespace Tests\Feature\Chat;

use Tests\TestCase;

class UnauthenticatedApiResponseTest extends TestCase
{
    public function test_chat_api_without_json_header_returns_401(): void
    {
        $this->get('/api/chat/unread-count')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_chat_api_with_json_header_returns_401(): void
    {
        $this->withHeader('Accept', 'application/json')
            ->get('/api/chat/unread-count')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthenticated.');
    }
}
