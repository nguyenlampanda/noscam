<?php

namespace App\Services\Exchange;

final class ExchangeClaimStatus
{
    public const CLAIMED = 'claimed';
    public const SUBMITTED = 'submitted';
    public const REJECTED = 'rejected';
    public const DISPUTED = 'disputed';
    public const SETTLED = 'settled';
    public const REFUNDED = 'refunded';

    public const FINAL_STATUSES = [
        self::SETTLED,
        self::REFUNDED,
    ];

    public static function isFinal(string $status): bool
    {
        return in_array(
            $status,
            self::FINAL_STATUSES,
            true
        );
    }
}
