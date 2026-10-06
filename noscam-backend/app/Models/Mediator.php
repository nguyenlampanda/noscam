<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Mediator extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'status',
        'is_public',
        'admin_note',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    public function identifiers(): HasMany
    {
        return $this->hasMany(MediatorIdentifier::class);
    }

    public function depositLogs(): HasMany
    {
        return $this->hasMany(MediatorDepositLog::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(
            MediatorTag::class,
            'mediator_mediator_tag'
        );
    }
}
