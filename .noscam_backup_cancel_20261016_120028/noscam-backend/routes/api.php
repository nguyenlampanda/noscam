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
use App\Http\Controllers\Api\AdminSocialCustomerController;
use App\Http\Controllers\Api\AdminSocialDashboardController;
use App\Http\Controllers\Api\AdminSocialOrderController;
use App\Http\Controllers\Api\AdminSocialOrderAuditController;
use App\Http\Controllers\Api\AdminSocialOrderReconciliationController;
use App\Http\Controllers\Api\AdminSocialOrderReconciliationPreviewController;
use App\Http\Controllers\Api\AdminSocialOrderResolutionController;
use App\Http\Controllers\Api\AdminSocialProviderController;
use App\Http\Controllers\Api\AdminSocialServiceController;
use App\Http\Controllers\Api\AdminWalletTopupController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\SocialServiceController;
use App\Http\Controllers\Api\SocialOrderController;
use App\Http\Controllers\Api\CustomerProfileController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Digital Services
|--------------------------------------------------------------------------
*/

Route::get(
    '/digital/services',
    [\App\Http\Controllers\Api\PublicDigitalServiceController::class, 'index']
)->middleware('throttle:public-search');

Route::get(
    '/digital/services/{digitalService}',
    [\App\Http\Controllers\Api\PublicDigitalServiceController::class, 'show']
)->whereNumber('digitalService')
  ->middleware('throttle:public-search');

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
| Community Comment Moderation
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth:sanctum',
    'throttle:customer-api',
])->group(function () {
    Route::get(
        '/community/moderation/comments',
        [\App\Http\Controllers\Api\CommunityCommentModerationController::class, 'index']
    );

    Route::patch(
        '/community/moderation/comments/{comment}',
        [\App\Http\Controllers\Api\CommunityCommentModerationController::class, 'update']
    )->whereNumber('comment');
});

/*
|--------------------------------------------------------------------------
| Community Moderation
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth:sanctum',
    'throttle:customer-api',
])->group(function () {
    Route::get(
        '/community/moderation/posts',
        [\App\Http\Controllers\Api\CommunityModerationController::class, 'index']
    );

    Route::patch(
        '/community/moderation/posts/{post}',
        [\App\Http\Controllers\Api\CommunityModerationController::class, 'update']
    )->whereNumber('post');
});

/*
|--------------------------------------------------------------------------
| Community Comments
|--------------------------------------------------------------------------
*/

Route::get(
    '/community/posts/{post}/comments',
    [\App\Http\Controllers\Api\CommunityCommentController::class, 'index']
)->whereNumber('post')
  ->middleware('throttle:public-search');

Route::post(
    '/community/posts/{post}/comments',
    [\App\Http\Controllers\Api\CommunityCommentController::class, 'store']
)->whereNumber('post')
  ->middleware(['auth:sanctum', 'throttle:customer-api']);

/*
|--------------------------------------------------------------------------
| Community Reactions
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth:sanctum',
    'throttle:customer-api',
])->group(function () {
    Route::post(
        '/community/posts/{post}/like',
        [\App\Http\Controllers\Api\CommunityReactionController::class, 'store']
    )->whereNumber('post');

    Route::delete(
        '/community/posts/{post}/like',
        [\App\Http\Controllers\Api\CommunityReactionController::class, 'destroy']
    )->whereNumber('post');
});

/*
|--------------------------------------------------------------------------
| Community Posts
|--------------------------------------------------------------------------
*/

Route::get(
    '/community/posts',
    [\App\Http\Controllers\Api\CommunityPostController::class, 'index']
)->middleware('throttle:public-search');

Route::post(
    '/community/posts',
    [\App\Http\Controllers\Api\CommunityPostController::class, 'store']
)->middleware(['auth:sanctum', 'throttle:customer-api']);

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
| Social Services Public API
|--------------------------------------------------------------------------
*/

Route::get(
    '/social/services',
    [SocialServiceController::class, 'index']
)->middleware('throttle:public-search');

Route::get(
    '/social/services/{service}',
    [SocialServiceController::class, 'show']
)->middleware('throttle:public-search');

/*
|--------------------------------------------------------------------------
| Customer Auth
|--------------------------------------------------------------------------
*/

Route::post(
    '/digital/guest/orders/{orderId}/lookup',
    [\App\Http\Controllers\Api\GuestDigitalOrderController::class, 'show']
)->whereNumber('orderId')->middleware('throttle:customer-auth');

Route::post(
    '/digital/guest/orders',
    [\App\Http\Controllers\Api\GuestDigitalOrderController::class, 'store']
)->middleware('throttle:customer-auth');

Route::post(
    '/digital/guest/orders/{orderId}/quotes/{quoteId}/respond',
    [\App\Http\Controllers\Api\GuestDigitalOrderController::class, 'respondToQuote']
)->whereNumber('orderId')
  ->whereNumber('quoteId')
  ->middleware('throttle:customer-auth');


Route::post(
    '/auth/register',
    [CustomerAuthController::class, 'register']
)->middleware('throttle:customer-auth');

Route::post(
    '/auth/login',
    [CustomerAuthController::class, 'login']
)->middleware('throttle:customer-auth');

/*
|--------------------------------------------------------------------------
| Customer Protected API
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth:sanctum',
    'throttle:customer-api',
])->group(function () {
    Route::get(
        '/auth/me',
        [CustomerAuthController::class, 'me']
    );

    Route::post(
        '/auth/logout',
        [CustomerAuthController::class, 'logout']
    );

    Route::get(
        '/profile',
        [CustomerProfileController::class, 'show']
    );

    Route::put(
        '/profile',
        [CustomerProfileController::class, 'update']
    );

    Route::put(
        '/profile/password',
        [CustomerProfileController::class, 'changePassword']
    );

    Route::get(
        '/exchange/campaigns',
        [\App\Http\Controllers\Api\ExchangeCampaignController::class, 'index']
    );

    Route::get(
        '/exchange/campaigns/by-request/{key}',
        [\App\Http\Controllers\Api\ExchangeCampaignController::class, 'lookupByRequest']
    )->where('key', '[A-Za-z0-9_-]{16,128}');

    Route::get(
        '/exchange/campaigns/{id}',
        [\App\Http\Controllers\Api\ExchangeCampaignController::class, 'show']
    )->whereNumber('id');

    Route::get(
        '/exchange/campaigns/{id}/claims',
        [\App\Http\Controllers\Api\ExchangeCampaignController::class, 'claims']
    )->whereNumber('id');

    Route::post(
        '/exchange/campaigns',
        [\App\Http\Controllers\Api\ExchangeCampaignController::class, 'store']
    );

    Route::get(
        '/exchange/tasks',
        [\App\Http\Controllers\Api\ExchangeTaskController::class, 'index']
    );

    Route::get(
        '/exchange/claims/mine',
        [\App\Http\Controllers\Api\ExchangeTaskController::class, 'mine']
    );

    Route::post(
        '/exchange/tasks/{campaignId}/claim',
        [\App\Http\Controllers\Api\ExchangeTaskController::class, 'claim']
    );

    Route::post(
        '/exchange/claims/{claimId}/submit',
        [\App\Http\Controllers\Api\ExchangeTaskController::class, 'submit']
    );

    Route::post(
        '/exchange/claims/{claimId}/approve',
        [\App\Http\Controllers\Api\ExchangeTaskController::class, 'approve']
    );

    Route::post(
        '/exchange/claims/{claimId}/reject',
        [\App\Http\Controllers\Api\ExchangeTaskController::class, 'reject']
    );

    Route::post(
        '/exchange/claims/{claimId}/appeal',
        [\App\Http\Controllers\Api\ExchangeTaskController::class, 'appeal']
    );

    Route::get(
        '/exchange/prices',
        [\App\Http\Controllers\Api\ExchangeTaskPriceController::class, 'index']
    );

    Route::get(
        '/exchange/accounts',
        [\App\Http\Controllers\Api\ExchangeSocialAccountController::class, 'index']
    );

    Route::post(
        '/exchange/accounts',
        [\App\Http\Controllers\Api\ExchangeSocialAccountController::class, 'store']
    );

    Route::patch(
        '/exchange/accounts/{id}/default',
        [\App\Http\Controllers\Api\ExchangeSocialAccountController::class, 'setDefault']
    )->whereNumber('id');

    Route::delete(
        '/exchange/accounts/{id}',
        [\App\Http\Controllers\Api\ExchangeSocialAccountController::class, 'destroy']
    )->whereNumber('id');

    Route::get(
        '/wallet',
        [WalletController::class, 'show']
    );

    Route::get(
        '/wallet/transactions',
        [WalletController::class, 'transactions']
    );

    Route::get(
        '/wallet/topups',
        [WalletController::class, 'topups']
    );

    Route::post(
        '/wallet/topups',
        [WalletController::class, 'createTopup']
    );

    Route::get(
        '/digital/orders',
        [\App\Http\Controllers\Api\DigitalOrderController::class, 'index']
    );

    Route::post(
        '/digital/orders',
        [\App\Http\Controllers\Api\DigitalOrderController::class, 'store']
    );


    Route::post(
        '/digital/orders/{digitalOrder}/quotes/{quote}/respond',
        [\App\Http\Controllers\Api\DigitalOrderController::class, 'respondToQuote']
    )->whereNumber('digitalOrder')->whereNumber('quote');

    Route::post(
        '/digital/orders/{digitalOrder}/pay-wallet',
        [\App\Http\Controllers\Api\DigitalOrderPaymentController::class, 'payWithWallet']
    )->whereNumber('digitalOrder');

    Route::get(
        '/digital/orders/{digitalOrder}',
        [\App\Http\Controllers\Api\DigitalOrderController::class, 'show']
    )->whereNumber('digitalOrder');

    Route::get(
        '/social/orders',
        [SocialOrderController::class, 'index']
    );

    Route::post(
        '/social/orders',
        [SocialOrderController::class, 'store']
    );

    Route::get(
        '/social/orders/{order}',
        [SocialOrderController::class, 'show']
    );
});

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

        /*
        |--------------------------------------------------------------------------
        | Exchange Task Prices
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/exchange/campaigns',
            [\App\Http\Controllers\Api\AdminExchangeCampaignController::class, 'index']
        );

        Route::get(
            '/exchange/campaigns/{campaignId}/claims',
            [\App\Http\Controllers\Api\AdminExchangeCampaignController::class, 'campaignClaims']
        );

        Route::patch(
            '/exchange/campaigns/{campaignId}/status',
            [\App\Http\Controllers\Api\AdminExchangeCampaignController::class, 'changeStatus']
        );

        Route::post(
            '/exchange/campaigns/{campaignId}/cancel-request',
            [\App\Http\Controllers\Api\AdminExchangeCampaignController::class, 'requestCancellation']
        );

        Route::post(
            '/exchange/campaigns/{campaignId}/cancel-finalize',
            [\App\Http\Controllers\Api\AdminExchangeCampaignController::class, 'finalizeCancellation']
        );

        Route::get(
            '/exchange/prices',
            [\App\Http\Controllers\Api\AdminExchangeTaskPriceController::class, 'index']
        );

        Route::put(
            '/exchange/prices',
            [\App\Http\Controllers\Api\AdminExchangeTaskPriceController::class, 'update']
        );

        Route::get(
            '/exchange/disputes',
            [\App\Http\Controllers\Api\AdminExchangeDisputeListController::class, 'index']
        );

        Route::post(
            '/exchange/disputes/{disputeId}/resolve',
            [\App\Http\Controllers\Api\AdminExchangeDisputeController::class, 'resolve']
        );

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
        | Social Services
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/social/dashboard',
            [AdminSocialDashboardController::class, 'index']
        );

        Route::get(
            '/social/providers',
            [AdminSocialProviderController::class, 'index']
        );

        Route::get(
            '/social/providers/{provider}',
            [AdminSocialProviderController::class, 'show']
        );

        Route::put(
            '/social/providers/{provider}',
            [AdminSocialProviderController::class, 'update']
        );

        Route::post(
            '/social/providers/{provider}/test',
            [AdminSocialProviderController::class, 'test']
        );

        Route::post(
            '/social/providers/{provider}/sync',
            [AdminSocialProviderController::class, 'sync']
        );

        /*
        |--------------------------------------------------------------------------
        | Social Services
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/social/services',
            [AdminSocialServiceController::class, 'index']
        );

        Route::get(
            '/social/provider-services',
            [AdminSocialServiceController::class, 'providerServices']
        );

        Route::patch(
            '/social/provider-services/{providerService}',
            [AdminSocialServiceController::class, 'updateProviderService']
        );

        Route::post(
            '/social/provider-services/{providerService}/map',
            [AdminSocialServiceController::class, 'mapProviderService']
        );

        Route::delete(
            '/social/provider-services/{providerService}/map',
            [AdminSocialServiceController::class, 'unmapProviderService']
        );

        Route::post(
            '/social/services',
            [AdminSocialServiceController::class, 'store']
        );

        Route::put(
            '/social/services/{service}',
            [AdminSocialServiceController::class, 'update']
        );

        Route::get(
            '/social/orders',
            [AdminSocialOrderController::class, 'index']
        );

        Route::get(
            '/social/orders/audit',
            [AdminSocialOrderController::class, 'audit']
        );

        Route::get(
            '/social/orders/{order}',
            [AdminSocialOrderController::class, 'show']
        );

        Route::get(
            '/social/orders/{order}/audits',
            [AdminSocialOrderAuditController::class, 'index']
        );

        Route::post(
            '/social/orders/{order}/audits',
            [AdminSocialOrderAuditController::class, 'store']
        );

        Route::get(
            '/social/orders/{order}/resolutions',
            [AdminSocialOrderResolutionController::class, 'index']
        );

        Route::get(
            '/social/orders/{order}/reconcile-preview',
            [AdminSocialOrderReconciliationPreviewController::class, 'show']
        );

        Route::post(
            '/social/orders/{order}/reconcile',
            [AdminSocialOrderReconciliationController::class, 'resolve']
        );

        Route::post(
            '/social/orders/{order}/cancel',
            [AdminSocialOrderController::class, 'cancel']
        );

        Route::patch(
            '/social/orders/{order}/status',
            [AdminSocialOrderController::class, 'updateStatus']
        );

        Route::get(
            '/social/customers',
            [AdminSocialCustomerController::class, 'index']
        );

        Route::get(
            '/social/customers/{user}',
            [AdminSocialCustomerController::class, 'show']
        );

        Route::post(
            '/social/customers/{user}/wallet',
            [AdminSocialCustomerController::class, 'adjustWallet']
        );

        Route::get(
            '/social/topups',
            [AdminWalletTopupController::class, 'index']
        );

        Route::post(
            '/social/topups',
            [AdminWalletTopupController::class, 'store']
        );

        Route::post(
            '/social/topups/{topup}/approve',
            [AdminWalletTopupController::class, 'approve']
        );

        Route::post(
            '/social/topups/{topup}/reject',
            [AdminWalletTopupController::class, 'reject']
        );

        /*
        |--------------------------------------------------------------------------
        | Digital Services
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/digital/services',
            [\App\Http\Controllers\Api\AdminDigitalServiceController::class, 'index']
        );

        Route::post(
            '/digital/services',
            [\App\Http\Controllers\Api\AdminDigitalServiceController::class, 'store']
        );

        Route::put(
            '/digital/services/{digitalService}',
            [\App\Http\Controllers\Api\AdminDigitalServiceController::class, 'update']
        );

        Route::patch(
            '/digital/services/{digitalService}/status',
            [\App\Http\Controllers\Api\AdminDigitalServiceController::class, 'status']
        );

        /*
        |--------------------------------------------------------------------------
        | Digital Orders
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/digital/orders',
            [\App\Http\Controllers\Api\AdminDigitalOrderController::class, 'index']
        );

        Route::get(
            '/digital/orders/{digitalOrder}',
            [\App\Http\Controllers\Api\AdminDigitalOrderController::class, 'show']
        )->whereNumber('digitalOrder');


        Route::post(
            '/digital/orders/{digitalOrder}/quotes',
            [\App\Http\Controllers\Api\AdminDigitalOrderController::class, 'createQuote']
        )->whereNumber('digitalOrder');

        Route::patch(
            '/digital/orders/{digitalOrder}/status',
            [\App\Http\Controllers\Api\AdminDigitalOrderController::class, 'updateStatus']
        )->whereNumber('digitalOrder');

        Route::post(
            '/digital/orders/{digitalOrder}/confirm-bank-payment',
            [\App\Http\Controllers\Api\AdminDigitalBankPaymentController::class, 'confirm']
        )->whereNumber('digitalOrder');



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


/*
|--------------------------------------------------------------------------
| CHAT API ROUTES
|--------------------------------------------------------------------------
*/

\Illuminate\Support\Facades\Route::middleware([
    'auth:sanctum',
    'throttle:customer-api',
])->group(function () {
    \Illuminate\Support\Facades\Route::get(
        '/chat/messages',
        [\App\Http\Controllers\Api\ChatController::class, 'customerMessages']
    );

    \Illuminate\Support\Facades\Route::post(
        '/chat/messages',
        [\App\Http\Controllers\Api\ChatController::class, 'customerSend']
    );

    \Illuminate\Support\Facades\Route::post(
        '/chat/read',
        [\App\Http\Controllers\Api\ChatController::class, 'customerRead']
    );
});

\Illuminate\Support\Facades\Route::prefix('admin/chat')
    ->middleware([
        'auth:sanctum',
        'moderator',
        'throttle:admin-api',
    ])
    ->group(function () {
        \Illuminate\Support\Facades\Route::get(
            '/conversations',
            [\App\Http\Controllers\Api\ChatController::class, 'adminConversations']
        );

        \Illuminate\Support\Facades\Route::get(
            '/conversations/{conversation}/messages',
            [\App\Http\Controllers\Api\ChatController::class, 'adminMessages']
        );

        \Illuminate\Support\Facades\Route::post(
            '/conversations/{conversation}/messages',
            [\App\Http\Controllers\Api\ChatController::class, 'adminSend']
        );

        \Illuminate\Support\Facades\Route::post(
            '/conversations/{conversation}/read',
            [\App\Http\Controllers\Api\ChatController::class, 'adminRead']
        );
    });


/*
|--------------------------------------------------------------------------
| NOScam private broadcasting authentication
|--------------------------------------------------------------------------
*/
\Illuminate\Support\Facades\Route::post(
    '/broadcasting/auth',
    [\Illuminate\Broadcasting\BroadcastController::class, 'authenticate']
)->middleware([
    'auth:sanctum',
    'throttle:customer-api',
]);
