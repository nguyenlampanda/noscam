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

    public function test_real_vietinbank_transfer_formats(): void
    {
        $matcher = new SePayTransferMatcher();

        $this->assertSame(
            'lam200109',
            $matcher->usernameFromContent(
                '948D61112EU8YVFB SEVQR NOSCAM lam200109 FT26316019958523'
            )
        );

        $this->assertSame(
            'khoailang',
            $matcher->usernameFromContent(
                '156468113889-0589954412-SEVQR NOSCAM khoailang'
            )
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

    public function test_vietinbank_ct_den_prefix(): void
    {
        $matcher = new SePayTransferMatcher();

        $this->assertSame(
            'huyhoang',
            $matcher->usernameFromContent(
                'CT DEN:948T26B0LZ6ZUR28 SEVQR NOSCAM huyhoang'
            )
        );
    }

    public function test_rejects_multiple_sevqr_references(): void
    {
        $matcher = new SePayTransferMatcher();

        $this->assertNull(
            $matcher->usernameFromContent(
                'SEVQR NOSCAM user1 SEVQR NOSCAM user2'
            )
        );
    }

}
