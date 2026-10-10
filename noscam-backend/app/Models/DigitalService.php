<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DigitalService extends Model
{
    protected $fillable = [
        'code',
        'category',
        'name',
        'description',
        'pricing_type',
        'price_vnd',
        'platform',
        'requirements',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_vnd' => 'decimal:4',
            'requirements' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(DigitalOrder::class);
    }
}
