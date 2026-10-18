<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommunityPost extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'content',
        'category',
        'is_anonymous',
        'status',
        'published_at',
        'images',
        'work_mode',
        'city',
        'address',
        'salary',
        'salary_unit',
        'deadline',
        'contact',

    ];

    protected $hidden = [
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'is_anonymous' => 'boolean',
            'published_at' => 'datetime',
            'images' => 'array',
            'deadline' => 'date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(CommunityComment::class, 'post_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(CommunityReaction::class, 'post_id');
    }
}
