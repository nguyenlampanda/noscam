<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $guarded = ['*'];

    protected $hidden = ['image_path'];

    protected $appends = ['has_image'];

    public function getHasImageAttribute(): bool
    {
        return !empty($this->image_path);
    }

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    public function conversation()
    {
        return $this->belongsTo(ChatConversation::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
