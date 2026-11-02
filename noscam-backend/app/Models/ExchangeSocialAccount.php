<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExchangeSocialAccount extends Model
{
    protected $table = 'exchange_social_accounts';

    protected $fillable = [
        'user_id',
        'platform',
        'username',
        'normalized_username',
        'profile_url',
        'is_default',
        'is_active',
        'can_receive',
        'can_perform',
        'priority',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'can_receive' => 'boolean',
            'can_perform' => 'boolean',
            'priority' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
