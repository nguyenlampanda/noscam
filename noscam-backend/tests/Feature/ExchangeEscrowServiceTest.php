<?php

namespace Tests\Feature;

use App\Services\Exchange\ExchangeEscrowService;
use LogicException;
use Tests\TestCase;

class ExchangeEscrowServiceTest extends TestCase
{
    public function test_positive_integer_amount_is_valid(): void
    {
        $service = new ExchangeEscrowService();

        $this->assertSame(
            200000,
            $service->validateAmount(200000)
        );
    }

    public function test_zero_amount_is_rejected(): void
    {
        $service = new ExchangeEscrowService();

        $this->expectException(LogicException::class);

        $service->validateAmount(0);
    }

    public function test_negative_amount_is_rejected(): void
    {
        $service = new ExchangeEscrowService();

        $this->expectException(LogicException::class);

        $service->validateAmount(-1000);
    }
}
