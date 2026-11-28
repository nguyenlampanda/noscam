<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialOrder extends Model
{
    protected $hidden = [
        'provider_balance_snapshot_vnd',
        'provider_balance_snapshot_at',
    ];

    protected $fillable = [
        'code',
        'user_id',
        'social_service_id',
        'social_provider_id',
        'social_provider_service_id',
        'provider_order_id',
        'provider_balance_snapshot_vnd',
        'provider_balance_snapshot_at',
        'target',
        'quantity',
        'sell_amount',
        'cost_amount',
        'profit_amount',
        'status',
        'start_count',
        'remains',
        'refunded_amount',
        'idempotency_key',
        'attempts',
        'provider_error',
        'order_options',
        'provider_response',
        'submitted_at',
        'completed_at',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'sell_amount' => 'decimal:4',
            'cost_amount' => 'decimal:4',
            'provider_balance_snapshot_vnd' => 'decimal:4',
            'provider_balance_snapshot_at' => 'datetime',
            'profit_amount' => 'decimal:4',
            'refunded_amount' => 'decimal:4',
            'order_options' => 'array',
            'provider_response' => 'array',
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
            'last_synced_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(
            SocialService::class,
            'social_service_id'
        );
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(
            SocialProvider::class,
            'social_provider_id'
        );
    }

    public function providerService(): BelongsTo
    {
        return $this->belongsTo(
            SocialProviderService::class,
            'social_provider_service_id'
        );
    }
}
