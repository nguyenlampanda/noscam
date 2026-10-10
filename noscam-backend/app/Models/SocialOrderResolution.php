<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialOrderResolution extends Model
{
    protected $fillable = [
        'social_order_id',
        'social_order_audit_id',
        'admin_id',
        'action',
        'status_before',
        'status_after',
        'provider_order_id',
        'refund_amount',
        'note',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:4',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(SocialOrder::class, 'social_order_id');
    }

    public function audit(): BelongsTo
    {
        return $this->belongsTo(
            SocialOrderAudit::class,
            'social_order_audit_id'
        );
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
