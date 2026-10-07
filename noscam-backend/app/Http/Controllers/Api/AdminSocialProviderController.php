<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialProvider;
use App\Models\SocialProviderService;
use App\Services\Social\SocialProviderManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdminSocialProviderController extends Controller
{
    public function index(): JsonResponse
    {
        $providers = SocialProvider::query()
            ->withCount(['services', 'orders'])
            ->orderBy('priority')
            ->orderBy('id')
            ->get()
            ->map(
                fn (SocialProvider $provider) =>
                    $this->serialize($provider)
            );

        return response()->json([
            'data' => $providers,
        ]);
    }

    public function show(
        SocialProvider $provider
    ): JsonResponse {
        $provider->loadCount([
            'services',
            'orders',
        ]);

        return response()->json([
            'data' =>
                $this->serialize($provider),
        ]);
    }

    public function update(
        Request $request,
        SocialProvider $provider
    ): JsonResponse {
        $data = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:255',
            ],

            'api_url' => [
                'sometimes',
                'url',
                'max:1000',
            ],

            'api_key' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'status' => [
                'sometimes',
                'in:active,inactive,error',
            ],

            'priority' => [
                'sometimes',
                'integer',
                'min:0',
                'max:100000',
            ],

            'auto_sync' => [
                'sometimes',
                'boolean',
            ],

            'exchange_rate_to_vnd' => [
                'sometimes',
                'numeric',
                'gt:0',
                'max:1000000000',
            ],

            'price_multiplier' => [
                'sometimes',
                'numeric',
                'gt:0',
                'max:1000000',
            ],

            'settings' => [
                'sometimes',
                'nullable',
                'array',
            ],

            'settings.username' => [
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        if (
            array_key_exists(
                'api_key',
                $data
            )
            && blank($data['api_key'])
        ) {
            unset($data['api_key']);
        }

        if (
            array_key_exists(
                'settings',
                $data
            )
        ) {
            $data['settings'] = array_merge(
                $provider->settings ?? [],
                $data['settings'] ?? []
            );
        }

        $provider->update($data);

        $provider->loadCount([
            'services',
            'orders',
        ]);

        return response()->json([
            'message' =>
                'Đã cập nhật nhà cung cấp.',

            'data' =>
                $this->serialize($provider),
        ]);
    }

    public function test(
        SocialProvider $provider,
        SocialProviderManager $manager
    ): JsonResponse {
        if (empty($provider->api_key)) {
            return response()->json([
                'message' =>
                    'Nhà cung cấp chưa có API key.',
            ], 422);
        }

        try {
            $result =
                $manager
                    ->make($provider)
                    ->balance();

            $balance =
                $this->extractBalance(
                    $result
                );

            $currency = strtoupper(
                (string) (
                    data_get(
                        $result,
                        'currency'
                    )
                    ?? data_get(
                        $result,
                        'data.currency'
                    )
                    ?? $provider->currency
                    ?? 'VND'
                )
            );

            $provider->update([
                'balance' =>
                    $balance
                    ?? $provider->balance,

                'currency' =>
                    $currency,

                'status' =>
                    'active',

                'last_checked_at' =>
                    now(),

                'last_error' =>
                    null,
            ]);

            return response()->json([
                'message' =>
                    'Kết nối API thành công.',

                'data' => [
                    'balance' =>
                        $balance,

                    'currency' =>
                        $currency,

                    'balance_vnd' =>
                        $balance !== null
                            ? $balance
                                * (float) (
                                    $provider
                                        ->exchange_rate_to_vnd
                                    ?: 1
                                )
                            : null,
                ],
            ]);
        } catch (Throwable $e) {
            Log::warning(
                'Social provider test failed',
                [
                    'provider_id' =>
                        $provider->id,

                    'driver' =>
                        $provider->driver,

                    'error' =>
                        $e->getMessage(),
                ]
            );

            $provider->update([
                'status' =>
                    'error',

                'last_checked_at' =>
                    now(),

                'last_error' =>
                    $e->getMessage(),
            ]);

            return response()->json([
                'message' =>
                    'Không thể kết nối API.',

                'error' =>
                    $e->getMessage(),
            ], 422);
        }
    }

    public function sync(
        SocialProvider $provider,
        SocialProviderManager $manager
    ): JsonResponse {
        if (empty($provider->api_key)) {
            return response()->json([
                'message' =>
                    'Nhà cung cấp chưa có API key.',
            ], 422);
        }

        try {
            $result =
                $manager
                    ->make($provider)
                    ->services();

            $services =
                $this->normalizeServices(
                    $result
                );

            if (empty($services)) {
                throw new \RuntimeException(
                    'API không trả về danh sách dịch vụ.'
                );
            }

            $syncedIds = [];

            DB::transaction(
                function () use (
                    $provider,
                    $services,
                    &$syncedIds
                ) {
                    foreach (
                        $services as $item
                    ) {
                        $providerServiceId =
                            (string) (
                                $item['service']
                                ?? $item['id']
                                ?? ''
                            );

                        if (
                            $providerServiceId === ''
                        ) {
                            continue;
                        }

                        $name =
                            (string) (
                                $item['name']
                                ?? $item[
                                    'service_name'
                                ]
                                ?? (
                                    'Service '
                                    .$providerServiceId
                                )
                            );

                        $rate =
                            $item['rate']
                            ?? 0;

                        if (
                            !is_numeric($rate)
                        ) {
                            $rate = 0;
                        }

                        $min =
                            $item['min']
                            ?? 1;

                        $max =
                            $item['max']
                            ?? 1;

                        $providerActive =
                            array_key_exists(
                                'provider_active',
                                $item
                            )
                                ? (bool) $item[
                                    'provider_active'
                                ]
                                : (
                                    array_key_exists(
                                        'is_active',
                                        $item
                                    )
                                        ? (bool) $item[
                                            'is_active'
                                        ]
                                        : true
                                );

                        $record =
                            SocialProviderService::
                                updateOrCreate(
                                    [
                                        'social_provider_id' =>
                                            $provider->id,

                                        'provider_service_id' =>
                                            $providerServiceId,
                                    ],
                                    [
                                        'provider_service_name' =>
                                            $name,

                                        'cost_price_per_1000' =>
                                            $rate,

                                        'min_quantity' =>
                                            max(
                                                1,
                                                (int) $min
                                            ),

                                        'max_quantity' =>
                                            max(
                                                1,
                                                (int) $max
                                            ),

                                        'priority' =>
                                            100,

                                        'is_active' =>
                                            $providerActive,

                                        'provider_data' =>
                                            $item,

                                        'last_synced_at' =>
                                            now(),
                                    ]
                                );

                        $syncedIds[] =
                            $record->id;
                    }

                    SocialProviderService::query()
                        ->where(
                            'social_provider_id',
                            $provider->id
                        )
                        ->when(
                            !empty($syncedIds),
                            fn ($q) =>
                                $q->whereNotIn(
                                    'id',
                                    $syncedIds
                                )
                        )
                        ->update([
                            'is_active' =>
                                false,
                        ]);
                }
            );

            $provider->update([
                'last_synced_at' =>
                    now(),

                'last_error' =>
                    null,
            ]);

            return response()->json([
                'message' =>
                    'Đồng bộ dịch vụ thành công.',

                'data' => [
                    'synced' =>
                        count($syncedIds),
                ],
            ]);
        } catch (Throwable $e) {
            Log::warning(
                'Social provider sync failed',
                [
                    'provider_id' =>
                        $provider->id,

                    'driver' =>
                        $provider->driver,

                    'error' =>
                        $e->getMessage(),
                ]
            );

            $provider->update([
                'last_error' =>
                    $e->getMessage(),
            ]);

            return response()->json([
                'message' =>
                    'Không thể đồng bộ dịch vụ.',

                'error' =>
                    $e->getMessage(),
            ], 422);
        }
    }

    private function normalizeServices(
        array $result
    ): array {
        if (array_is_list($result)) {
            return $result;
        }

        foreach (
            [
                'data',
                'services',
                'data.services',
            ] as $path
        ) {
            $value =
                data_get(
                    $result,
                    $path
                );

            if (
                is_array($value)
                && array_is_list($value)
            ) {
                return $value;
            }
        }

        return [];
    }

    private function extractBalance(
        array $response
    ): ?float {
        foreach (
            [
                'balance',
                'data.balance',
                'data.user.balance',
                'money',
            ] as $path
        ) {
            $value =
                data_get(
                    $response,
                    $path
                );

            if (
                $value !== null
                && is_numeric($value)
            ) {
                return (float) $value;
            }
        }

        return null;
    }

    private function serialize(
        SocialProvider $provider
    ): array {
        $balance =
            (float) (
                $provider->balance
                ?? 0
            );

        $exchangeRate =
            (float) (
                $provider
                    ->exchange_rate_to_vnd
                ?: 1
            );

        return [
            'id' =>
                $provider->id,

            'name' =>
                $provider->name,

            'slug' =>
                $provider->slug,

            'driver' =>
                $provider->driver,

            'api_url' =>
                $provider->api_url,

            'has_api_key' =>
                !empty(
                    $provider->api_key
                ),

            'api_key' =>
                $provider->api_key,

            'status' =>
                $provider->status,

            'balance' =>
                $provider->balance,

            'currency' =>
                $provider->currency,

            'exchange_rate_to_vnd' =>
                $provider
                    ->exchange_rate_to_vnd,

            'price_multiplier' =>
                $provider
                    ->price_multiplier,

            'balance_vnd' =>
                $balance
                * $exchangeRate,

            'priority' =>
                $provider->priority,

            'auto_sync' =>
                $provider->auto_sync,

            'settings' =>
                $provider->settings,

            'last_checked_at' =>
                $provider
                    ->last_checked_at,

            'last_synced_at' =>
                $provider
                    ->last_synced_at,

            'last_error' =>
                $provider->last_error,

            'services_count' =>
                $provider
                    ->services_count
                ?? 0,

            'orders_count' =>
                $provider
                    ->orders_count
                ?? 0,
        ];
    }
}
