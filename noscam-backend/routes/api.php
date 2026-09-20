<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminEvidenceController;
use App\Http\Controllers\Api\AdminReportController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReportModerationController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

Route::get('/search', [SearchController::class, 'index']);
Route::get('/alerts', [AlertController::class, 'index']);
Route::post('/reports', [ReportController::class, 'store']);

Route::post(
    '/admin/login',
    [AdminAuthController::class, 'login']
);

Route::prefix('admin')
    ->middleware([
        'auth:sanctum',
        'moderator',
    ])
    ->group(function () {
        Route::post(
            '/logout',
            [AdminAuthController::class, 'logout']
        );

        Route::get(
            '/reports',
            [AdminReportController::class, 'index']
        );

        Route::get(
            '/reports/{report}',
            [AdminReportController::class, 'show']
        );

        Route::patch(
            '/reports/{report}/status',
            [ReportModerationController::class, 'update']
        );

        Route::get(
            '/evidences/{evidence}',
            [AdminEvidenceController::class, 'show']
        );
    });