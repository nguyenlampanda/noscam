<?php

namespace Tests\Feature\Social;

use Tests\TestCase;
use App\Http\Controllers\Api\AdminSocialOrderReconciliationController;
use Illuminate\Http\Request;

class ReconciliationSafetyTest extends TestCase
{
    public function test_reconciliation_execution_is_disabled(): void
    {
        $controller = new AdminSocialOrderReconciliationController();

        $response = $controller->resolve();

        $this->assertSame(503, $response->getStatusCode());
    }

    public function test_testing_environment_uses_sqlite(): void
    {
        $this->assertSame(
            'sqlite',
            config('database.default')
        );
    }

    public function test_testing_environment_uses_array_cache(): void
    {
        $this->assertSame(
            'array',
            config('cache.default')
        );
    }
}
