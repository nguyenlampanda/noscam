<?php

namespace Tests\Unit;

use App\Services\Social\SePayTransferMatcher;
use PHPUnit\Framework\TestCase;

class SePayTransferMatcherTest extends TestCase
{
    public function test_valid_transfer_content(): void
    {
        $matcher = new SePayTransferMatcher();

        $this->assertSame(
            'nguyenlam',
            $matcher->usernameFromContent('NOSCAM nguyenlam')
        );
        $this->assertSame(
            'nguyenlam',
            $matcher->usernameFromContent('SEVQR NOSCAM nguyenlam')
        );
    }

    public function test_invalid_transfer_content(): void
    {
        $matcher = new SePayTransferMatcher();

        foreach ([
            
            'SEVQR NOSCAM',
            'SEVQR NOSCAM user1 user2',
            'SEVQR NOSCAM user@abc',
            'SEVQR OTHER nguyenlam',
        ] as $content) {
            $this->assertNull(
                $matcher->usernameFromContent($content)
            );
        }
    }
}
