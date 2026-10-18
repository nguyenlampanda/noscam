<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExchangeTaskPrice extends Model
{
    protected $table = 'exchange_task_prices';

    protected $fillable = [
        'platform',
        'task_type',
        'cost_per_task',
        'reward_per_task',
        'min_quantity',
        'is_enabled',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'cost_per_task' => 'decimal:4',
            'reward_per_task' => 'decimal:4',
            'min_quantity' => 'integer',
            'is_enabled' => 'boolean',
        ];
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
