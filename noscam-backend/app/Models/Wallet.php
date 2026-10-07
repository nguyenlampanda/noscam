<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wallet extends Model
{
    protected $fillable = [
        'user_id',
        'balance',
        'total_deposited',
        'total_spent',
        'total_refunded',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:4',
            'total_deposited' => 'decimal:4',
            'total_spent' => 'decimal:4',
            'total_refunded' => 'decimal:4',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(
            WalletTransaction::class
        );
    }
}
