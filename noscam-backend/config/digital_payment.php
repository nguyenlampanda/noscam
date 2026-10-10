<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Digital service bank transfer
    |--------------------------------------------------------------------------
    | Chỉ dùng cho thanh toán dịch vụ số NoScam.
    | Không liên quan đến ví Social hoặc nạp ví.
    */

    'bank' => [
        'name' => env('DIGITAL_PAYMENT_BANK_NAME', 'Techcombank'),
        'bin' => env('DIGITAL_PAYMENT_BANK_BIN', '970407'),
        'account_number' => env('DIGITAL_PAYMENT_ACCOUNT', '999321'),
        'account_name' => env('DIGITAL_PAYMENT_ACCOUNT_NAME', 'NGUYEN LAM'),
    ],

    'transfer_prefix' => 'NSD',
];
