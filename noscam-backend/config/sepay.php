<?php

return [
    'webhook_key' => env('SEPAY_WEBHOOK_KEY'),
    'bank_account' => env('SEPAY_BANK_ACCOUNT'),
    'auto_credit_enabled' => env('SEPAY_AUTO_CREDIT_ENABLED', false),
];
