<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialProviderService extends Model
{
    protected $fillable = [
        'social_provider_id',
        'social_service_id',
        'provider_service_id',
        'provider_service_name',
        'cost_price_per_1000',
        'min_quantity',
        'max_quantity',
        'priority',
        'is_active',
        'provider_data',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'cost_price_per_1000' =>
                'decimal:4',

            'is_active' =>
                'boolean',

            'provider_data' =>
                'array',

            'last_synced_at' =>
                'datetime',
        ];
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(
            SocialProvider::class,
            'social_provider_id'
        );
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(
            SocialService::class,
            'social_service_id'
        );
    }

    public function orders(): HasMany
    {
        return $this->hasMany(
            SocialOrder::class
        );
    }

    public function costPriceVnd(): float
    {
        $provider = $this->provider;

        if (!$provider) {
            return 0;
        }

        $cost = (float)
            $this->cost_price_per_1000;

        $exchangeRate = (float) (
            $provider
                ->exchange_rate_to_vnd
            ?: 1
        );

        $multiplier = (float) (
            $provider
                ->price_multiplier
            ?: 1
        );

        return $cost
            * $exchangeRate
            * $multiplier;
    }
}
