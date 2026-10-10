<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DigitalOrder extends Model
{
    // Các trường thanh toán và trạng thái chỉ được
    // thay đổi qua logic Backend được kiểm soát.
    protected $guarded = ['*'];

    protected $hidden = [
        'guest_lookup_hash',
        'guest_request_key',
        'guest_request_hash',
    ];

    protected function casts(): array
    {
        return [
            'request_data' => 'array',
            'amount_vnd' => 'decimal:4',
            'paid_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(
            DigitalService::class,
            'digital_service_id'
        );
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(
            DigitalQuote::class,
            'digital_order_id'
        );
    }
}
