<?php

namespace App\Services\Social;

use App\Models\SocialProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use RuntimeException;
use Throwable;

class ProviderWalletBalanceService
{
    public function __construct(
        private SocialProviderManager $manager
    ) {}

    public function sync(?int $providerId = null): array
    {
        $providers = SocialProvider::query()
            ->where('status', 'active')
            ->get();

        $groups = $providers->groupBy(
            fn ($provider) => in_array(
                $provider->driver,
                ['vietnamfb', 'vietnamfb_v2'],
                true
            )
                ? 'vietnamfb'
                : 'provider-'.$provider->id
        );

        $results = [];

        foreach ($groups as $group => $members) {
            if (
                $providerId !== null
                && !$members->contains('id', $providerId)
            ) {
                continue;
            }

            $lock = Cache::lock(
                'provider-wallet-sync-'.$group,
                120
            );

            if (!$lock->get()) {
                continue;
            }

            try {
                $source = $group === 'vietnamfb'
                    ? SocialProvider::where(
                        'driver', 'vietnamfb'
                    )->first()
                    : $members->first();

                if (!$source || empty($source->api_key)) {
                    throw new RuntimeException(
                        'Thiếu cấu hình nguồn số dư.'
                    );
                }

                $response = $this->manager
                    ->make($source)
                    ->balance();

                if (
                    array_key_exists('success', $response)
                    && !filter_var(
                        $response['success'],
                        FILTER_VALIDATE_BOOLEAN
                    )
                ) {
                    throw new RuntimeException(
                        'API báo truy vấn thất bại.'
                    );
                }

                $raw = data_get($response, 'balance')
                    ?? data_get($response, 'data.balance')
                    ?? data_get($response, 'data.user.balance')
                    ?? data_get($response, 'money');

                if (
                    !is_numeric($raw)
                    || !is_finite((float) $raw)
                    || (float) $raw < 0
                ) {
                    throw new RuntimeException(
                        'Số dư API không hợp lệ.'
                    );
                }

                $currency = strtoupper(trim((string) (
                    data_get($response, 'currency')
                    ?? data_get($response, 'data.currency')
                    ?? $source->currency
                )));

                if ($group === 'vietnamfb' && $currency !== 'VND') {
                    throw new RuntimeException(
                        'Nguồn VietnamFB không trả số dư VND.'
                    );
                }

                if (!in_array($currency, ['VND', 'USD'], true)) {
                    throw new RuntimeException(
                        'Đơn vị tiền tệ chưa được hỗ trợ.'
                    );
                }

                $rate = $currency === 'VND'
                    ? 1.0
                    : (float) $source->exchange_rate_to_vnd;

                if (!is_finite($rate) || $rate <= 0) {
                    throw new RuntimeException(
                        'Tỷ giá không hợp lệ.'
                    );
                }

                $balance = round((float) $raw * $rate, 4);

                DB::table('social_providers')
                    ->whereIn('id', $members->pluck('id'))
                    ->update([
                        'wallet_group' => $group,
                        'wallet_balance_vnd' => $balance,
                        'wallet_checked_at' => now(),
                        'wallet_error' => null,
                    ]);

                $results[$group] = [
                    'success' => true,
                    'balance_vnd' => $balance,
                ];
            } catch (Throwable $e) {
                DB::table('social_providers')
                    ->whereIn('id', $members->pluck('id'))
                    ->update([
                        'wallet_group' => $group,
                        'wallet_error' =>
                            'Không thể đồng bộ số dư API.',
                    ]);

                $results[$group] = [
                    'success' => false,
                ];
            } finally {
                $lock->release();
            }
        }

        return $results;
    }
}
