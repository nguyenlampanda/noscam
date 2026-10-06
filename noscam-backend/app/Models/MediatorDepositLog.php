<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MediatorDepositLog extends Model
{
    protected $fillable = [
        'mediator_id',
        'admin_id',
        'amount',
        'note',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'recorded_at' => 'date',
        ];
    }

    public function mediator(): BelongsTo
    {
        return $this->belongsTo(Mediator::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
