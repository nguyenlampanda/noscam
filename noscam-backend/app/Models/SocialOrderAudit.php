<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialOrderAudit extends Model
{
    protected $fillable = [
        'social_order_id',
        'admin_id',
        'result',
        'provider_order_id',
        'note',
        'evidence',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(
            SocialOrder::class,
            'social_order_id'
        );
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'admin_id'
        );
    }
}
