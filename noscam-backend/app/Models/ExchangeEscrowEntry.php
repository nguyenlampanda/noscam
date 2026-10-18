<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExchangeEscrowEntry extends Model
{
    protected $table = 'exchange_escrow_entries';

    protected $fillable = [
        'campaign_id',
        'claim_id',
        'entry_type',
        'amount',
        'idempotency_key',
        'wallet_transaction_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'meta' => 'array',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(
            ExchangeCampaign::class,
            'campaign_id'
        );
    }

    public function claim(): BelongsTo
    {
        return $this->belongsTo(
            ExchangeTaskClaim::class,
            'claim_id'
        );
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(
            WalletTransaction::class,
            'wallet_transaction_id'
        );
    }
}
