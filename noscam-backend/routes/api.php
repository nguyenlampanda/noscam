<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminEvidenceController;
use App\Http\Controllers\Api\AdminMediatorController;
use App\Http\Controllers\Api\AdminReportController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\CommunityFeedbackController;
use App\Http\Controllers\Api\MediatorController;
use App\Http\Controllers\Api\MediatorBankController;
use App\Http\Controllers\Api\MediatorTagController;
use App\Http\Controllers\Api\PublicStatsController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReportModerationController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
*/

Route::get(
    '/stats',
    [PublicStatsController::class, 'index']
)->middleware(
    'throttle:public-search'
);

Route::get(
    '/search',
    [SearchController::class, 'index']
)->middleware(
    'throttle:public-search'
);

Route::get(
    '/alerts',
    [AlertController::class, 'index']
)->middleware(
    'throttle:public-search'
);

Route::get(
    '/community-feedback',
    [CommunityFeedbackController::class, 'index']
)->middleware(
    'throttle:public-search'
);

Route::post(
    '/community-feedback',
    [CommunityFeedbackController::class, 'store']
)->middleware(
    'throttle:public-report'
);

Route::post(
    '/reports',
    [ReportController::class, 'store']
)->middleware(
    'throttle:public-report'
);

/*
|--------------------------------------------------------------------------
| Mediator Public API
|--------------------------------------------------------------------------
*/

Route::get(
    '/mediator-tags',
    [MediatorTagController::class, 'index']
)->middleware(
    'throttle:public-search'
);


Route::get(
    '/mediator-banks',
    [MediatorBankController::class, 'index']
)->middleware(
    'throttle:public-search'
);

Route::get(
    '/mediators',
    [MediatorController::class, 'index']
)->middleware(
    'throttle:public-search'
);

Route::get(
    '/mediators/lookup',
    [MediatorController::class, 'lookup']
)->middleware(
    'throttle:public-search'
);

Route::get(
    '/mediators/{code}',
    [MediatorController::class, 'show']
)->middleware(
    'throttle:public-search'
);

/*
|--------------------------------------------------------------------------
| Admin Login
|--------------------------------------------------------------------------
*/

Route::post(
    '/admin/login',
    [AdminAuthController::class, 'login']
)->middleware(
    'throttle:admin-login'
);

/*
|--------------------------------------------------------------------------
| Protected Admin API
|--------------------------------------------------------------------------
*/

Route::prefix('admin')
    ->middleware([
        'auth:sanctum',
        'moderator',
        'throttle:admin-api',
    ])
    ->group(function () {
        Route::post(
            '/logout',
            [
                AdminAuthController::class,
                'logout',
            ]
        );

        Route::get(
            '/me',
            [
                AdminAuthController::class,
                'me',
            ]
        );

        Route::get(
            '/dashboard',
            [
                AdminDashboardController::class,
                'index',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Reports
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/reports',
            [
                AdminReportController::class,
                'index',
            ]
        );

        Route::get(
            '/reports/{report}',
            [
                AdminReportController::class,
                'show',
            ]
        );

        Route::patch(
            '/reports/{report}/status',
            [
                ReportModerationController::class,
                'update',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Mediator Tags
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/mediator-tags',
            [
                MediatorTagController::class,
                'store',
            ]
        );

        Route::put(
            '/mediator-tags/{mediatorTag}',
            [
                MediatorTagController::class,
                'update',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Mediators
        |--------------------------------------------------------------------------
        */


        Route::post(
            '/mediator-banks',
            [
                MediatorBankController::class,
                'store',
            ]
        );

        Route::put(
            '/mediator-banks/{mediatorBank}',
            [
                MediatorBankController::class,
                'update',
            ]
        );

        Route::get(
            '/mediators',
            [
                AdminMediatorController::class,
                'index',
            ]
        );

        Route::post(
            '/mediators',
            [
                AdminMediatorController::class,
                'store',
            ]
        );

        Route::get(
            '/mediators/{mediator}',
            [
                AdminMediatorController::class,
                'show',
            ]
        );

        Route::put(
            '/mediators/{mediator}',
            [
                AdminMediatorController::class,
                'update',
            ]
        );

        Route::post(
            '/mediators/{mediator}/deposits',
            [
                AdminMediatorController::class,
                'addDeposit',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Evidence
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/evidences/{evidence}',
            [
                AdminEvidenceController::class,
                'show',
            ]
        );
    });
