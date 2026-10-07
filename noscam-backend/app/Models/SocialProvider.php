<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialProvider extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'driver',
        'api_url',
        'api_key',
        'status',
        'balance',
        'currency',
        'exchange_rate_to_vnd',
        'price_multiplier',
        'priority',
        'auto_sync',
        'last_checked_at',
        'last_synced_at',
        'last_error',
        'settings',
    ];

    protected $hidden = [
        'api_key',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'balance' => 'decimal:4',
            'exchange_rate_to_vnd' => 'decimal:4',
            'price_multiplier' => 'decimal:6',
            'auto_sync' => 'boolean',
            'last_checked_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    public function services(): HasMany
    {
        return $this->hasMany(
            SocialProviderService::class
        );
    }

    public function orders(): HasMany
    {
        return $this->hasMany(
            SocialOrder::class
        );
    }
}
