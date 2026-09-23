<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Report extends Model
{
    protected $fillable = [
        'scam_type',
        'phone',
        'bank_account',
        'bank',
        'social',
        'website',
        'description',
        'loss_amount',
        'occurred_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'loss_amount' =>
                'decimal:2',

            'occurred_at' =>
                'date',
        ];
    }

    public function entities(): BelongsToMany
    {
        return $this->belongsToMany(
            Entity::class,
            'entity_report'
        )->withTimestamps();
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(
            Evidence::class
        );
    }

    public function moderationLogs(): HasMany
    {
        return $this->hasMany(
            ReportModerationLog::class
        );
    }
}