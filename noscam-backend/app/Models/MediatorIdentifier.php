<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MediatorIdentifier extends Model
{
    protected $fillable = [
        'mediator_id',
        'type',
        'value',
        'normalized_value',
        'bank_id',
        'label',
        'bank_name',
        'account_holder',
        'is_public',
    ];

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
        ];
    }

    public function mediator(): BelongsTo
    {
        return $this->belongsTo(
            Mediator::class
        );
    }

    public function bank(): BelongsTo
    {
        return $this->belongsTo(
            MediatorBank::class,
            'bank_id'
        );
    }
}
