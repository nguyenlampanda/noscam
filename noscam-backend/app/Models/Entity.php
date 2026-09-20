<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Entity extends Model
{
    protected $fillable = [
        'type',
        'value',
        'normalized_value',
        'report_count',
        'risk_score',
        'risk_level',
        'first_detected_at',
        'last_report_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'report_count' => 'integer',
            'risk_score' => 'integer',
            'first_detected_at' => 'datetime',
            'last_report_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function reports(): BelongsToMany
    {
        return $this->belongsToMany(
            Report::class,
            'entity_report'
        )->withTimestamps();
    }

    public function relations(): HasMany
    {
        return $this->hasMany(
            EntityRelation::class,
            'entity_id'
        );
    }

    public function incomingRelations(): HasMany
    {
        return $this->hasMany(
            EntityRelation::class,
            'related_entity_id'
        );
    }
}