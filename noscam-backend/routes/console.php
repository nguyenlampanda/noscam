<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| NoScam Social Orders
|--------------------------------------------------------------------------
|
| Tự gửi đơn mới và đồng bộ trạng thái provider.
|
*/

use Illuminate\Support\Facades\Schedule;

Schedule::command('social:process-orders --limit=50')
    ->everyMinute()
    ->withoutOverlapping(5);


/*
|--------------------------------------------------------------------------
| NoScam Exchange Auto Settlement
|--------------------------------------------------------------------------
|
| Tự động duyệt nhiệm vụ sau 48 giờ hoặc hoàn xu hết hạn kháng nghị.
|
*/

Schedule::command('exchange:process-expired --limit=50')
    ->everyMinute()
    ->withoutOverlapping(5);
