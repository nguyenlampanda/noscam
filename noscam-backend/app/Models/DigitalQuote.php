<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalQuote extends Model
{
    // Không cho phép mass assignment mặc định.
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'amount_vnd' => 'decimal:4',
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(
            DigitalOrder::class,
            'digital_order_id'
        );
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
