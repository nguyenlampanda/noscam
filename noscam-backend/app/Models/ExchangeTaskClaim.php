<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ExchangeTaskClaim extends Model
{
    protected $table = 'exchange_task_claims';

    protected $fillable = [
        'campaign_id',
        'worker_user_id',
        'social_account_id',
        'submitted_username',
        'submitted_profile_url',
        'status',
        'claimed_at',
        'submitted_at',
        'review_deadline_at',
        'rejected_at',
        'appeal_deadline_at',
        'settled_at',
        'finalized_at',
        'rejection_reason',
        'risk_hold',
    ];

    protected function casts(): array
    {
        return [
            'claimed_at' => 'datetime',
            'submitted_at' => 'datetime',
            'review_deadline_at' => 'datetime',
            'rejected_at' => 'datetime',
            'appeal_deadline_at' => 'datetime',
            'settled_at' => 'datetime',
            'finalized_at' => 'datetime',
            'risk_hold' => 'boolean',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(ExchangeCampaign::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'worker_user_id');
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(
            ExchangeSocialAccount::class,
            'social_account_id'
        );
    }

    public function dispute(): HasOne
    {
        return $this->hasOne(
            ExchangeTaskDispute::class,
            'claim_id'
        );
    }
}
