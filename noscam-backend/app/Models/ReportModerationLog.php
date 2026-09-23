<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportModerationLog extends Model
{
    protected $fillable = [
        'report_id',
        'user_id',
        'from_status',
        'to_status',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(
            Report::class
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class
        );
    }
}