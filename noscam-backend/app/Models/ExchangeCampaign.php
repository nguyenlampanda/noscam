<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExchangeCampaign extends Model
{
    protected $table = 'exchange_campaigns';

    protected $fillable = [
        'user_id',
        'social_account_id',
        'platform',
        'task_type',
        'target_url',
        'quantity',
        'cost_per_task',
        'reward_per_task',
        'budget_total',
        'budget_held',
        'budget_settled',
        'budget_refunded',
        'status',
        'rules_accepted',
        'rules_accepted_at',
        'idempotency_key',
        'request_hash',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'cost_per_task' => 'decimal:4',
            'reward_per_task' => 'decimal:4',
            'budget_total' => 'decimal:4',
            'budget_held' => 'decimal:4',
            'budget_settled' => 'decimal:4',
            'budget_refunded' => 'decimal:4',
            'rules_accepted' => 'boolean',
            'rules_accepted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(
            ExchangeSocialAccount::class,
            'social_account_id'
        );
    }

    public function claims(): HasMany
    {
        return $this->hasMany(
            ExchangeTaskClaim::class,
            'campaign_id'
        );
    }

    public function escrowEntries(): HasMany
    {
        return $this->hasMany(
            ExchangeEscrowEntry::class,
            'campaign_id'
        );
    }
}
