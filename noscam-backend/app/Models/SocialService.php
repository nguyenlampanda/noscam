<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialService extends Model
{
    protected $fillable = [
        'code',
        'platform',
        'category',
        'name',
        'description',
        'min_quantity',
        'max_quantity',
        'sell_price_per_1000',
        'is_active',
        'sort_order',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'sell_price_per_1000' => 'decimal:4',
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function providerServices(): HasMany
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
