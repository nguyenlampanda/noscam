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


    public function test_bank_suffix_variants(): void
    {
        $matcher = new SePayTransferMatcher();

        foreach ([
            'SEVQR NOSCAM nguyenlam CT TU 123456',
            'SEVQR NOSCAM nguyenlam IBFT 123456',
            'SEVQR NOSCAM nguyenlam CT DEN:123456',
            'CT TU 123456 SEVQR NOSCAM nguyenlam',
        ] as $content) {
            $this->assertSame('nguyenlam', $matcher->usernameFromContent($content));
        }
    }

    public function test_rejects_ambiguous_bank_suffix(): void
    {
        $matcher = new SePayTransferMatcher();

        foreach ([
            'SEVQR NOSCAM user1 user2',
            'SEVQR NOSCAM user1 CT TU',
            'SEVQR NOSCAM user1 IBFT',
            'SEVQR NOSCAM user1 CT TU 123456 user2',
            'SEVQR NOSCAM user1 SEVQR NOSCAM user2',
        ] as $content) {
            $this->assertNull($matcher->usernameFromContent($content));
        }
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


    public function test_extended_bank_transfer_formats(): void
    {
        $matcher = new SePayTransferMatcher();

        foreach ([
            'myvu1407',
            'joyseee',
            'vinguyen',
            'vanphu',
            'dang',
            'dangphong',
            'tobioo',
            'user.name',
            'user-name',
        ] as $username) {
            $content = 'CT DEN:948T26B15MPDMXEM '
                .'MBVCB.17208068133.440899.SEVQR NOSCAM '
                .$username
                .'.CT tu 123456789 NGUYEN VAN A '
                .'toi 987654321 NGUYEN VAN B tai VIETINBANK';

            $this->assertSame(
                $username,
                $matcher->usernameFromContent($content)
            );
        }

        $this->assertSame(
            'thu',
            $matcher->usernameFromContent(
                '948D6112403L4Y8S SEVQR NOSCAM thu-241126-20:51:18 6328ASCB02XG5DSD'
            )
        );

        $this->assertNull(
            $matcher->usernameFromContent(
                'SEVQR NOSCAM user1.CT tu user2'
            )
        );
    }

}
