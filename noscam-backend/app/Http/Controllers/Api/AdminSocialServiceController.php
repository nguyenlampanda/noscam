<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialProviderService;
use App\Models\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\Social\SocialServiceClassifier;
use Illuminate\Validation\Rule;

class AdminSocialServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SocialService::query()
            ->with([
                'providerServices' => fn ($q) =>
                    $q->with('provider')
                        ->orderBy('priority')
                        ->orderBy('id'),
            ]);

        if ($request->filled('platform')) {
            $query->where(
                'platform',
                $request->string('platform')
            );
        }

        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input('search')
            );

            $query->where(function ($q) use ($search) {
                $q->where(
                    'name',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'code',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'category',
                    'like',
                    "%{$search}%"
                );
            });
        }

        return response()->json(
            $query
                ->orderBy('sort_order')
                ->orderBy('id')
                ->paginate(
                    min(
                        100,
                        max(
                            10,
                            (int) $request->input(
                                'per_page',
                                50
                            )
                        )
                    )
                )
        );
    }

    public function providerServices(
        Request $request
    ): JsonResponse {
        $query = SocialProviderService::query()
            ->with([
                'provider:id,name,slug,driver,currency,exchange_rate_to_vnd,price_multiplier',
                'service:id,code,platform,category,name,description,min_quantity,max_quantity,sell_price_per_1000,is_active,sort_order',
            ]);

        if ($request->filled('provider_id')) {
            $query->where(
                'social_provider_id',
                $request->integer('provider_id')
            );
        }

        if ($request->filled('mapped')) {
            $mapped = filter_var(
                $request->input('mapped'),
                FILTER_VALIDATE_BOOLEAN
            );

            $mapped
                ? $query->whereNotNull(
                    'social_service_id'
                )
                : $query->whereNull(
                    'social_service_id'
                );
        }

        if ($request->filled('active')) {
            $active = filter_var(
                $request->input('active'),
                FILTER_VALIDATE_BOOLEAN
            );

            $query->where(
                'is_active',
                $active
            );
        }

        if ($request->filled('provider_availability')) {
            $availability = $request->input('provider_availability');

            if (!in_array(
                $availability,
                ['available', 'unavailable', 'unknown'],
                true
            )) {
                return response()->json([
                    'message' => 'Trạng thái nguồn không hợp lệ.',
                ], 422);
            }

            $query->where('provider_availability', $availability);
        }

        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input('search')
            );

            $query->where(function ($q) use ($search) {
                $q->where(
                    'provider_service_name',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'provider_service_id',
                    'like',
                    "%{$search}%"
                );
            });
        }

        if ($request->filled('platform')) {
            $platform = (string) $request->input('platform');

            $allowed = [
                'facebook', 'instagram', 'tiktok', 'threads',
                'youtube', 'telegram', 'twitter', 'discord',
                'spotify', 'soundcloud', 'pinterest', 'linkedin',
                'twitch', 'reddit', 'snapchat', 'whatsapp',
                'zalo', 'shopee', 'google', 'capcut', 'seo', 'other',
            ];

            if (!in_array($platform, $allowed, true)) {
                return response()->json([
                    'message' => 'Nền tảng không hợp lệ.',
                ], 422);
            }

            $ids = [];

            (clone $query)->chunkById(500, function ($items) use (&$ids, $platform) {
                foreach ($items as $item) {
                    if ($this->sourcePlatform($item) === $platform) {
                        $ids[] = (int) $item->id;
                    }
                }
            });

            $query->whereIntegerInRaw('id', $ids);
        }

        if ($request->filled('interaction_type')) {
            $interaction = (string) $request->input('interaction_type');

            if (!in_array($interaction, ['follow', 'like', 'comment', 'like_comment', 'view', 'share', 'live', 'like_live', 'reaction', 'save', 'member', 'repost', 'watch_time', 'review', 'pk', 'verification', 'bot_start', 'other'], true)) {
                return response()->json([
                    'message' => 'Loại tương tác không hợp lệ.',
                ], 422);
            }

            $ids = [];

            (clone $query)->chunkById(500, function ($items) use (&$ids, $interaction) {
                foreach ($items as $item) {
                    if (in_array($interaction, $this->sourceInteractionTypes($item), true)) {
                        $ids[] = (int) $item->id;
                    }
                }
            });

            $query->whereIntegerInRaw('id', $ids);
        }

        // NOSCAM: Sap xep gia von VND truoc khi phan trang.
        $paginator = $query
            ->orderByRaw("
                ROUND(
                    COALESCE(social_provider_services.cost_price_per_1000, 0)
                    * COALESCE(NULLIF((
                        SELECT exchange_rate_to_vnd
                        FROM social_providers
                        WHERE social_providers.id = social_provider_services.social_provider_id
                    ), 0), 1)
                    * COALESCE(NULLIF((
                        SELECT price_multiplier
                        FROM social_providers
                        WHERE social_providers.id = social_provider_services.social_provider_id
                    ), 0), 1)
                    * CASE WHEN LOWER((
                        SELECT driver
                        FROM social_providers
                        WHERE social_providers.id = social_provider_services.social_provider_id
                    )) = 'vietnamfb' THEN 1000 ELSE 1 END,
                    4
                ) ASC
            ")
            ->orderBy('social_provider_id')
            ->orderBy('provider_service_name')
            ->orderBy('id')
            ->paginate(
                min(
                    100,
                    max(
                        10,
                        (int) $request->input(
                            'per_page',
                            50
                        )
                    )
                )
            );

        $paginator->getCollection()
            ->transform(
                fn ($item) =>
                    $this->serializeProviderService(
                        $item
                    )
            );

        return response()->json(
            $paginator
        );
    }

    public function store(
        Request $request
    ): JsonResponse {
        $data = $this->validated(
            $request
        );

        $service = SocialService::create(
            $data
        );

        return response()->json([
            'message' => 'Đã tạo dịch vụ.',
            'data' => $service,
        ], 201);
    }

    public function update(
        Request $request,
        SocialService $service
    ): JsonResponse {
        $data = $this->validated(
            $request,
            $service
        );

        if (
            array_key_exists(
                'sell_price_per_1000',
                $data
            ) &&
            $data['sell_price_per_1000'] !== null
        ) {
            $providerServices = $service
                ->providerServices()
                ->where('is_active', true)
                ->with('provider')
                ->get();

            if ($providerServices->isNotEmpty()) {
                $maxCostVnd = $providerServices
                    ->max(
                        fn ($item) =>
                            $item->costPriceVnd()
                            * (
                                in_array(
                                    strtolower((string) ($item->provider?->driver ?? '')),
                                    ['vietnamfb', 'vietnamfb_v2'],
                                    true
                                ) ? 1000 : 1
                            )
                    );

                if (
                    (float) $data[
                        'sell_price_per_1000'
                    ] <= $maxCostVnd
                ) {
                    return response()->json([
                        'message' =>
                            'Giá bán phải cao hơn giá vốn Provider.',
                        'errors' => [
                            'sell_price_per_1000' => [
                                'Giá bán phải lớn hơn '
                                .number_format(
                                    $maxCostVnd,
                                    0,
                                    ',',
                                    '.'
                                )
                                .'đ / 1.000.',
                            ],
                        ],
                    ], 422);
                }
            }
        }

        $service->update($data);

        return response()->json([
            'message' =>
                'Đã cập nhật dịch vụ.',
            'data' =>
                $service
                    ->fresh()
                    ->load(
                        'providerServices.provider'
                    ),
        ]);
    }

    public function updateProviderService(
        Request $request,
        SocialProviderService $providerService
    ): JsonResponse {
        $data = $request->validate([
            'priority' => [
                'sometimes',
                'integer',
                'min:0',
                'max:100000',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ]);

        $providerService->loadMissing('provider');

        if (
            $providerService->provider?->driver === 'bufflikenhanh_v2'
            && !empty($data['is_active'])
        ) {
            $providerService->loadMissing('service');

            $target = $providerService->service;
            $cost = $providerService->costPriceVnd();

            if (
                $providerService->provider_availability !== 'available'
                || !is_finite($cost)
                || $cost <= 0
                || (int) $providerService->min_quantity < 1
                || (int) $providerService->max_quantity < (int) $providerService->min_quantity
                || (
                    $target && (
                        (float) $target->sell_price_per_1000 <= $cost
                        || (int) $target->min_quantity < (int) $providerService->min_quantity
                        || (int) $target->max_quantity > (int) $providerService->max_quantity
                        || (int) $target->max_quantity < (int) $target->min_quantity
                    )
                )
            ) {
                return response()->json([
                    'message' => 'Chưa thể bật nguồn: kiểm tra mapping, trạng thái API, giá bán và Min/Max.',
                ], 422);
            }
        }

        $providerService->update(
            $data
        );

        return response()->json([
            'message' =>
                'Đã cập nhật dịch vụ nguồn.',
            'data' =>
                $this->serializeProviderService(
                    $providerService
                        ->fresh()
                        ->load([
                            'provider',
                            'service',
                        ])
                ),
        ]);
    }

    public function mapProviderService(
        Request $request,
        SocialProviderService $providerService
    ): JsonResponse {
        if ($providerService->social_service_id !== null) {
            return response()->json([
                'message' => 'Dịch vụ API này đã được đưa lên bán.',
            ], 422);
        }

        $data = $request->validate([
            'social_service_id' => [
                'nullable',
                'integer',
                'exists:social_services,id',
            ],

            'platform' => [
                'required_without:social_service_id',
                'nullable',
                'in:facebook,instagram,tiktok,threads,youtube,telegram,twitter,discord,spotify,soundcloud,pinterest,linkedin,twitch,reddit,snapchat,whatsapp,zalo,other',
            ],

            'category' => [
                'required_without:social_service_id',
                'nullable',
                'string',
                'max:100',
            ],

            'name' => [
                'required_without:social_service_id',
                'nullable',
                'string',
                'max:255',
            ],

            'code' => [
                'nullable',
                'string',
                'max:100',
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'sell_price_per_1000' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'min_quantity' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'max_quantity' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'priority' => [
                'nullable',
                'integer',
                'min:0',
                'max:100000',
            ],

            'is_active' => [
                'nullable',
                'boolean',
            ],
        ]);

        if (empty($data['social_service_id'])) {
            $providerService->loadMissing('provider');

            $driver = strtolower(
                (string) ($providerService->provider?->driver ?? '')
            );

            $cost = $providerService->costPriceVnd()
                * (
                    $driver === 'vietnamfb' ? 1000 : 1
                );

            if (
                !isset($data['sell_price_per_1000']) ||
                (float) $data['sell_price_per_1000'] <= $cost
            ) {
                return response()->json([
                    'message' => 'Giá bán phải cao hơn giá vốn Provider.',
                ], 422);
            }
        }

        /*
         * BuffLikeNhanh V2:
         * Validate provider limits when creating a new service.
         * Never widen provider-supported quantity limits.
         */
        if (empty($data['social_service_id'])) {
            $providerService->loadMissing('provider');

            if (
                $providerService->provider?->driver
                === 'bufflikenhanh_v2'
            ) {
                $sourceMin = (int) $providerService->min_quantity;
                $sourceMax = (int) $providerService->max_quantity;

                $requestedMin = (int) (
                    $data['min_quantity'] ?? $sourceMin
                );

                $requestedMax = (int) (
                    $data['max_quantity'] ?? $sourceMax
                );

                if (
                    $sourceMin < 1
                    || $sourceMax < $sourceMin
                    || $requestedMin < $sourceMin
                    || $requestedMax > $sourceMax
                    || $requestedMax < $requestedMin
                ) {
                    return response()->json([
                        'message' =>
                            'Min/Max không phù hợp giới hạn BuffLikeNhanh V2.',
                    ], 422);
                }
            }
        }

        /*
         * New VietnamFB mappings without published limits must
         * receive explicit quantity limits from the administrator.
         */
        if (empty($data['social_service_id'])) {
            $providerService->loadMissing('provider');

            $isVietnamFb =
                strtolower((string) ($providerService->provider?->driver ?? ''))
                === 'vietnamfb';

            if ($isVietnamFb) {
                $source = $providerService->provider_data ?? [];
                $source = is_array($source) ? $source : [];
                $raw = $source['provider_data'] ?? [];
                $raw = is_array($raw) ? $raw : [];

                $hasMin = (
                    is_numeric($raw['min'] ?? null)
                    && (int) $raw['min'] > 0
                ) || (($source['min_verified'] ?? false) === true);

                $hasMax = (
                    is_numeric($raw['max'] ?? null)
                    && (int) $raw['max'] > 0
                ) || (($source['max_verified'] ?? false) === true);

                if (
                    (!$hasMin && empty($data['min_quantity']))
                    || (!$hasMax && empty($data['max_quantity']))
                ) {
                    return response()->json([
                        'message' =>
                            'API VietnamFB chưa cung cấp đầy đủ Min/Max. '
                            .'Admin cần nhập giới hạn trước khi đưa dịch vụ lên bán.',
                    ], 422);
                }
            }
        }

        /*
         * VietnamFB V2: verify published provider limits.
         * Do not silently widen the allowed quantity range.
         */
        if (empty($data['social_service_id'])) {
            $providerService->loadMissing('provider');

            if (
                strtolower((string) ($providerService->provider?->driver ?? ''))
                === 'vietnamfb_v2'
            ) {
                // Use normalized limits saved during provider sync.
                $sourceMin = (int) $providerService->min_quantity;
                $sourceMax = (int) $providerService->max_quantity;

                if (
                    $sourceMin < 1
                    || $sourceMax < $sourceMin
                ) {
                    return response()->json([
                        'message' =>
                            'VietnamFB V2 chưa có giới hạn Min/Max hợp lệ. Vui lòng đồng bộ lại dịch vụ nguồn.',
                    ], 422);
                }

                $min = (int) (
                    $data['min_quantity']
                    ?? $sourceMin
                );

                $max = (int) (
                    $data['max_quantity']
                    ?? $sourceMax
                );

                if (
                    $min < $sourceMin
                    || $max > $sourceMax
                    || $max < $min
                ) {
                    return response()->json([
                        'message' =>
                            'Giới hạn số lượng phải nằm trong Min/Max của VietnamFB V2.',
                    ], 422);
                }
            }
        }

        /*
         * BuffLikeNhanh V2:
         * Validate existing selling price and provider limits.
         * Never change the target service automatically.
         */
        if (!empty($data['social_service_id'])) {
            $providerService->loadMissing('provider');

            if (
                $providerService->provider?->driver
                === 'bufflikenhanh_v2'
            ) {
                $target = SocialService::findOrFail(
                    $data['social_service_id']
                );

                $cost = $providerService->costPriceVnd();

                if (
                    !is_finite($cost)
                    || $cost <= 0
                    || $target->sell_price_per_1000 === null
                    || (float) $target->sell_price_per_1000 <= $cost
                ) {
                    return response()->json([
                        'message' =>
                            'Giá bán phải cao hơn giá vốn BuffLikeNhanh V2.',
                    ], 422);
                }

                $sourceMin = (int) $providerService->min_quantity;
                $sourceMax = (int) $providerService->max_quantity;

                if (
                    $sourceMin < 1
                    || $sourceMax < $sourceMin
                    || (int) $target->min_quantity < $sourceMin
                    || (int) $target->max_quantity > $sourceMax
                    || (int) $target->max_quantity
                        < (int) $target->min_quantity
                ) {
                    return response()->json([
                        'message' =>
                            'Min/Max không phù hợp giới hạn BuffLikeNhanh V2.',
                    ], 422);
                }
            }
        }

        /*
         * Validate an existing service before attaching VietnamFB V2.
         * Never silently change its selling price or quantity limits.
         */
        if (!empty($data['social_service_id'])) {
            $providerService->loadMissing('provider');

            $driver = strtolower(
                (string) ($providerService->provider?->driver ?? '')
            );

            if ($driver === 'vietnamfb_v2') {
                $target = SocialService::findOrFail(
                    $data['social_service_id']
                );

                $costPer1000 =
                    $providerService->costPriceVnd();

                if (
                    $target->sell_price_per_1000 === null
                    || (float) $target->sell_price_per_1000 <= $costPer1000
                ) {
                    return response()->json([
                        'message' =>
                            'Giá bán dịch vụ hiện tại không cao hơn giá vốn VietnamFB V2.',
                    ], 422);
                }

                $metadata = $providerService->provider_data ?? [];
                $metadata = is_array($metadata) ? $metadata : [];

                $rawMin = $metadata['min'] ?? null;
                $rawMax = $metadata['max'] ?? null;

                if (
                    !is_numeric($rawMin)
                    || !is_numeric($rawMax)
                    || (int) $rawMin < 1
                    || (int) $rawMax < (int) $rawMin
                ) {
                    return response()->json([
                        'message' =>
                            'VietnamFB V2 chưa có Min/Max hợp lệ.',
                    ], 422);
                }

                if (
                    (int) $target->min_quantity < (int) $rawMin
                    || (int) $target->max_quantity > (int) $rawMax
                    || (int) $target->max_quantity < (int) $target->min_quantity
                ) {
                    return response()->json([
                        'message' =>
                            'Min/Max dịch vụ hiện tại không phù hợp VietnamFB V2.',
                    ], 422);
                }
            }
        }

        /*
         * VietnamFB V2 requires explicit admin confirmation.
         * Never trust inferred platform/category as verification.
         */
        $providerService->loadMissing('provider');

        if (
            strtolower((string) ($providerService->provider?->driver ?? ''))
            === 'vietnamfb_v2'
        ) {
            if (empty($data['social_service_id'])) {
                if (
                    empty($data['platform'])
                    || $data['platform'] === 'other'
                    || empty($data['category'])
                    || $data['category'] === 'other'
                ) {
                    return response()->json([
                        'message' =>
                            'VietnamFB V2 cần nền tảng và loại dịch vụ cụ thể.',
                    ], 422);
                }
            }
        }

        if ($providerService->provider?->driver === 'bufflikenhanh_v2') {
            $cost = $providerService->costPriceVnd();

            if (
                !is_finite($cost)
                || $cost <= 0
                || (
                    ($data['is_active'] ?? true)
                    && $providerService->provider_availability !== 'available'
                )
            ) {
                return response()->json([
                    'message' => 'Nguồn BuffLikeNhanh chưa khả dụng hoặc giá vốn không hợp lệ.',
                ], 422);
            }
        }

        $service = DB::transaction(
            function () use (
                $data,
                $providerService
            ) {
                if (
                    !empty(
                        $data['social_service_id']
                    )
                ) {
                    $service =
                        SocialService::findOrFail(
                            $data[
                                'social_service_id'
                            ]
                        );
                } else {
                    $min = (int) (
                        $data['min_quantity']
                        ?? $providerService
                            ->min_quantity
                        ?? 1
                    );

                    $max = (int) (
                        $data['max_quantity']
                        ?? $providerService
                            ->max_quantity
                        ?? 1000000
                    );

                    if ($max < $min) {
                        $max = $min;
                    }

                    $code = trim(
                        (string) (
                            $data['code']
                            ?? ''
                        )
                    );

                    if ($code === '') {
                        $code =
                            $this->makeUniqueCode(
                                $data['platform'],
                                $data['category'],
                                $data['name']
                            );
                    } else {
                        $code = Str::upper(
                            Str::slug(
                                $code,
                                '_'
                            )
                        );

                        if (
                            SocialService::where(
                                'code',
                                $code
                            )->exists()
                        ) {
                            $code .= '_'
                                .Str::upper(
                                    Str::random(5)
                                );
                        }
                    }

                    $service =
                        SocialService::create([
                            'code' => $code,
                            'platform' =>
                                $data['platform'],
                            'category' =>
                                $data['category'],
                            'name' =>
                                $data['name'],
                            'description' =>
                                $data['description']
                                ?? null,
                            'min_quantity' =>
                                $min,
                            'max_quantity' =>
                                $max,
                            'sell_price_per_1000' =>
                                $data['sell_price_per_1000']
                                ?? null,
                            'is_active' =>
                                $providerService->provider?->driver !== 'bufflikenhanh_v2',
                            'sort_order' =>
                                0,
                            'settings' => [
                                'created_from_provider_service_id'
                                    => $providerService->id,
                            ],
                        ]);
                }

                $providerService->update([
                    'social_service_id' =>
                        $service->id,

                    'priority' =>
                        $data['priority']
                        ?? $providerService
                            ->priority,

                    'is_active' =>
                        $providerService->provider?->driver === 'bufflikenhanh_v2'
                            ? (
                                $providerService->provider_availability === 'available'
                                && (bool) ($data['is_active'] ?? true)
                            )
                            : (
                                array_key_exists('is_active', $data)
                                    ? (bool) $data['is_active']
                                    : true
                            ),
                ]);

                return $service;
            }
        );

        return response()->json([
            'message' =>
                'Đã map dịch vụ nguồn.',
            'data' =>
                $service
                    ->fresh()
                    ->load(
                        'providerServices.provider'
                    ),
        ]);
    }

    public function unmapProviderService(
        SocialProviderService $providerService
    ): JsonResponse {
        $providerService->update([
            'social_service_id' => null,
        ]);

        return response()->json([
            'message' =>
                'Đã bỏ map dịch vụ nguồn.',
            'data' =>
                $this->serializeProviderService(
                    $providerService
                        ->fresh()
                        ->load('provider')
                ),
        ]);
    }

    private function makeUniqueCode(
        string $platform,
        string $category,
        string $name
    ): string {
        $base = Str::upper(
            Str::slug(
                $platform
                .'_'.$category
                .'_'.$name,
                '_'
            )
        );

        $base = Str::limit(
            $base,
            80,
            ''
        );

        $code = $base;
        $number = 2;

        while (
            SocialService::where(
                'code',
                $code
            )->exists()
        ) {
            $code =
                $base.'_'.$number;

            $number++;
        }

        return $code;
    }

    private function sourcePlatform(SocialProviderService $item): string
    {
        $classifier = app(SocialServiceClassifier::class);

        $metadata = (array) ($item->provider_data ?? []);
        $raw = (array) ($metadata['provider_data'] ?? []);

        $detect = function ($value) use ($classifier): string {
            if (!is_string($value)) {
                return 'other';
            }

            $text = strtolower(trim($value));

            $text = str_replace(
                ['instargam', 'goolge', '_'],
                ['instagram', 'google', ' '],
                $text
            );

            if (str_contains($text, 'shopee')) return 'shopee';
            if (str_contains($text, 'google')) return 'google';
            if (str_contains($text, 'capcut')) return 'capcut';
            if (preg_match('~traffic|seo~i', $text)) return 'seo';

            return $classifier->platform($text);
        };

        // 1. Nền tảng được nhà cung cấp khai báo.
        foreach ([
            $metadata['platform'] ?? '',
            $metadata['platform_name'] ?? '',
            $raw['platform'] ?? '',
            $raw['platform_name'] ?? '',
        ] as $value) {
            $platform = $detect($value);
            if ($platform !== 'other') {
                return $platform;
            }
        }

        // 2. Nhóm API VietnamFB Legacy.
        if ($item->provider?->driver === 'vietnamfb') {
            $group = strtoupper((string) (
                $metadata['group'] ?? ''
            ));

            $facebookGroups = [
                'BUFF_COMMENT', 'BUFF_LIKE', 'BUFF_LIVE',
                'BUFF_REEL', 'BUFF_SUB', 'BUFF_VIEW_NEW',
                'FANPAGE_REVIEW', 'GROUP_MEMBER', 'LIKEPAGE_2',
                'LIKE_COMMENT', 'SHARE_LIVE', 'STORY_VIEW',
                'VIP_COMMENT', 'VIP_LIKE', 'VIP_MAT',
                'VIRTUAL_SHARE',
            ];

            if (in_array($group, $facebookGroups, true)) {
                return 'facebook';
            }

            $platform = $detect($group);
            if ($platform !== 'other') {
                return $platform;
            }
        }

        // 3. Danh mục nguồn, ưu tiên phần tên nền tảng.
        foreach ([
            $metadata['category'] ?? '',
            $metadata['category_name'] ?? '',
            $raw['category'] ?? '',
            $raw['category_name'] ?? '',
        ] as $value) {
            if (!is_string($value)) {
                continue;
            }

            $prefix = explode('|', $value, 2)[0];

            $platform = $detect($prefix);

            if ($platform === 'other') {
                $platform = $detect($value);
            }

            if ($platform !== 'other') {
                return $platform;
            }
        }

        // 4. Tên gốc và mã dịch vụ.
        foreach ([
            $raw['name'] ?? '',
            $item->provider_service_name,
            $item->provider_service_id,
        ] as $value) {
            $platform = $detect($value);
            if ($platform !== 'other') {
                return $platform;
            }
        }

        // 5. Mapping chỉ dùng khi nguồn không đủ thông tin.
        return $detect($item->service?->platform ?? '');
    }

    private function sourceInteractionTypes(SocialProviderService $item): array
    {
        $metadata = (array) ($item->provider_data ?? []);
        $raw = (array) ($metadata['provider_data'] ?? []);

        $detect = function ($value): array {
            if (!is_string($value) || trim($value) === '') {
                return [];
            }

            $text = strtolower(\Illuminate\Support\Str::ascii($value));
            $text = str_replace('_', ' ', $text);
            $text = preg_replace('/\s+/', ' ', trim($text));

            $has = fn ($pattern) => preg_match('~'.$pattern.'~i', $text) === 1;
            $types = [];

            if ($has('thu nghiem|khong dung|dv test|dich vu dac biet')) {
                return ['other'];
            }

            if ($has('tic[h]? xanh|verification|verified badge')) {
                return ['verification'];
            }

            if ($has('bot start')) {
                return ['bot_start'];
            }

            if ($has('\bpk\b|battle points|diem chien dau')) {
                return ['pk'];
            }

            if ($has('\breview\b|danh gia')) {
                return ['review'];
            }

            if ($has('4000\s*h|600\s*k\s*phut|60\s*k\s*(live|offline)|gio xem|watch time|watch hours')) {
                return ['watch_time'];
            }

            if ($has('\b(like|tim)\s*(cho\s+)?(comments?|binh luan)\b|comment likes?')) {
                $types[] = 'like_comment';
                $text = preg_replace(
                    '~\b(like|tim)\s*(cho\s+)?(comments?|binh luan)\b|comment likes?~i',
                    '',
                    $text
                );
            }

            if ($has('\b(like|tim)\s*live(\s*stream)?\b')) {
                $types[] = 'like_live';
                $text = preg_replace(
                    '~\b(like|tim)\s*live(\s*stream)?\b~i',
                    '',
                    $text
                );
            }

            if ($has('\bfollow(ers?|ing)?\b|\bsub(s|scribers?|scribe)?\b|theo doi')) {
                $types[] = 'follow';
            }

            if ($has('\blikes?\b|\bviplike\b|\blikepage\b|\btim\b|\bthich\b') &&
                !$has('yeu thich')) {
                $types[] = 'like';
            }

            if ($has('\bcomments?\b|binh luan')) {
                $types[] = 'comment';
            }

            if ($has('\bshares?\b|chia se')) {
                $types[] = 'share';
            }

            if ($has('\breactions?\b|\breact\b|cam xuc')) {
                $types[] = 'reaction';
            }

            if ($has('\b(saves?|favorites?|favourites?)\b|yeu thich')) {
                $types[] = 'save';
            }

            if ($has('\bmembers?\b|thanh vien')) {
                $types[] = 'member';
            }

            if ($has('\b(reposts?|retweets?)\b|dang lai')) {
                $types[] = 'repost';
            }

            $live = $has('\blive\s*stream\b|\blive\b|\bmat live\b|\bvip mat\b');

            if ($live && (
                $has('\bviews?\b|\bmat\b') ||
                count($types) === 0
            )) {
                $types[] = 'live';
            }

            if (!$live && $has('\bviews?\b|\bplays?\b|\breels?\b|\bshorts?\b|luot xem')) {
                $types[] = 'view';
            }

            return array_values(array_unique($types));
        };

        // Uu tien danh muc goc, khong dung SMM type Default.
        foreach ([
            $metadata['category'] ?? '',
            $metadata['category_name'] ?? '',
            $raw['category_name'] ?? '',
            $raw['category'] ?? '',
            $metadata['group'] ?? '',
            $raw['name'] ?? '',
            $item->provider_service_name,
            $item->provider_service_id,
        ] as $value) {
            $types = $detect($value);

            if ($types !== []) {
                return $types;
            }
        }

        return ['other'];
    }

    private function serializeProviderService(
        SocialProviderService $item
    ): array {
        $provider = $item->provider;

        $exchangeRate = (float) (
            $provider?->exchange_rate_to_vnd
            ?: 1
        );

        $multiplier = (float) (
            $provider?->price_multiplier
            ?: 1
        );

        $rawCost = (float) (
            $item->cost_price_per_1000
            ?? 0
        );

        $driver = strtolower(
            (string) ($provider?->driver ?? '')
        );

        $unitFactor = $driver === 'vietnamfb' ? 1000 : 1;

        $costVnd =
            $rawCost
            * $exchangeRate
            * $multiplier
            * $unitFactor;

        return [
            'source_platform' => $this->sourcePlatform($item),
            'source_interaction_types' => $this->sourceInteractionTypes($item),

            'id' =>
                $item->id,

            'provider_service_id' =>
                $item->provider_service_id,

            'provider_service_name' =>
                $item->provider_service_name,

            'cost_price_per_1000' =>
                $item->cost_price_per_1000,

            'cost_currency' =>
                $provider?->currency
                ?? 'VND',

            'exchange_rate_to_vnd' =>
                $exchangeRate,

            'price_multiplier' =>
                $multiplier,

            'cost_price_vnd' =>
                round(
                    $costVnd,
                    4
                ),

            'min_quantity' =>
                $item->min_quantity,

            'max_quantity' =>
                $item->max_quantity,

            'priority' =>
                $item->priority,

            'is_active' =>
                $item->is_active,

            'provider_availability' =>
                $item->provider_availability,

            'provider_data' =>
                $item->provider_data,

            'last_synced_at' =>
                $item->last_synced_at,

            'provider' =>
                $provider,

            'service' =>
                $item->service,

            'is_mapped' =>
                !is_null(
                    $item->social_service_id
                ),
        ];
    }

    private function validated(
        Request $request,
        ?SocialService $service = null
    ): array {
        return $request->validate([
            'code' => [
                'required',
                'string',
                'max:100',
                Rule::unique(
                    'social_services',
                    'code'
                )->ignore($service?->id),
            ],

            'platform' => [
                'required',
                'in:facebook,instagram,tiktok,threads,youtube,telegram,twitter,discord,spotify,soundcloud,pinterest,linkedin,twitch,reddit,snapchat,whatsapp,zalo,other',
            ],

            'category' => [
                'required',
                'string',
                'max:100',
            ],

            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'min_quantity' => [
                'required',
                'integer',
                'min:1',
            ],

            'max_quantity' => [
                'required',
                'integer',
                'gte:min_quantity',
            ],

            'sell_price_per_1000' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],

            'sort_order' => [
                'nullable',
                'integer',
                'min:0',
            ],
        ]);
    }
}
