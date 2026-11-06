<?php

namespace App\Services\Social\Providers;

use App\Services\Social\SocialProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class VietnamFbProvider implements SocialProviderInterface
{
    public function __construct(
        protected string $apiUrl,
        protected string $apiKey,
        protected ?string $username = null
    ) {
    }

    protected function endpoint(): string
    {
        $url = rtrim($this->apiUrl, '/');

        if (!str_ends_with($url, '/api')) {
            $url .= '/api';
        }

        return $url;
    }

    protected function get(
        string $mc,
        string $site,
        array $params = []
    ): array {
        $response = Http::acceptJson()
            ->timeout(30)
            ->retry(2, 500)
            ->get(
                $this->endpoint(),
                array_merge([
                    'mc' => $mc,
                    'site' => $site,
                    'api_key' => $this->apiKey,
                ], $params)
            );

        return $this->parseResponse($response);
    }

    protected function post(
        string $mc,
        string $site,
        array $data = []
    ): array {
        // Xac thuc API tao don theo PHP SDK goc VietnamFB.
        $username = trim((string) $this->username);

        if ($username === '') {
            throw new RuntimeException(
                'VietnamFB chua cau hinh username_api.'
            );
        }

        $baseUrl = preg_replace(
            '~/api/?$~',
            '',
            rtrim($this->apiUrl, '/')
        );

        $response = Http::asForm()
            ->acceptJson()
            ->timeout(30)
            ->post(
                $baseUrl.'/?'.http_build_query([
                    'mc' => $mc,
                    'site' => $site,
                    'username_api' => $username,
                    'key_api' => $this->apiKey,
                ]),
                $data
            );

        return $this->parseResponse($response);
    }

    protected function parseResponse($response): array
    {
        if (!$response->successful()) {
            throw new RuntimeException(
                'VietnamFB HTTP error: '.$response->status()
            );
        }

        $body = trim($response->body());
        $lower = strtolower($body);

        if (
            str_contains($lower, '<html') ||
            str_contains($lower, '<script')
        ) {
            throw new RuntimeException(
                'VietnamFB trả về HTML/login page.'
            );
        }

        $json = $response->json();

        if (!is_array($json)) {
            throw new RuntimeException(
                'VietnamFB response không hợp lệ.'
            );
        }

        if (
            isset($json['success']) &&
            (int) $json['success'] === 0
        ) {
            throw new RuntimeException(
                (string) (
                    $json['message']
                    ?? 'VietnamFB API báo lỗi, cần đối soát.'
                )
            );
        }

        return $json;
    }

    public function balance(): array
    {
        return $this->get(
            'user',
            'get_user_balance'
        );
    }

    public function services(): array
    {
        $username = trim(
            (string) $this->username
        );

        if ($username === '') {
            throw new RuntimeException(
                'VietnamFB chưa cấu hình username.'
            );
        }

        $result = $this->get(
            'channel',
            'get_channel_info',
            [
                'username' => $username,
            ]
        );

        $services = [];

        foreach ($result as $group => $channels) {
            if (!is_array($channels)) {
                continue;
            }

            foreach ($channels as $channel) {
                if (!is_array($channel)) {
                    continue;
                }

                $channelNumber =
                    $channel['channel']
                    ?? $channel['id']
                    ?? null;

                if ($channelNumber === null) {
                    continue;
                }

                $groupName = strtoupper(
                    (string) $group
                );

                $channelId = (string) $channelNumber;

                $statusText = (string) (
                    $channel['status_text']
                    ?? ''
                );

                $services[] = [
                    'service' =>
                        $groupName.':'.$channelId,

                    'name' =>
                        $this->serviceName(
                            $groupName,
                            $channelId
                        ),

                    'rate' =>
                        is_numeric(
                            $channel['price'] ?? null
                        )
                            ? (float) $channel['price']
                            : 0,

                    'min' =>
                        is_numeric($channel['min'] ?? $channel['min_quantity'] ?? null)
                        && (int) ($channel['min'] ?? $channel['min_quantity']) > 0
                            ? (int) ($channel['min'] ?? $channel['min_quantity'])
                            : 1,

                    'max' =>
                        is_numeric($channel['max'] ?? $channel['max_quantity'] ?? null)
                        && (int) ($channel['max'] ?? $channel['max_quantity']) > 0
                            ? (int) ($channel['max'] ?? $channel['max_quantity'])
                            : 1000000,

                    'min_verified' =>
                        is_numeric($channel['min'] ?? $channel['min_quantity'] ?? null)
                        && (int) ($channel['min'] ?? $channel['min_quantity']) > 0,

                    'max_verified' =>
                        is_numeric($channel['max'] ?? $channel['max_quantity'] ?? null)
                        && (int) ($channel['max'] ?? $channel['max_quantity']) > 0,

                    'group' => $groupName,

                    'channel' => $channelId,

                    'status_text' => $statusText,

                    'provider_active' =>
                        $this->isChannelActive(
                            $channel
                        ),

                    'provider_data' => $channel,
                ];
            }
        }

        return $services;
    }

    protected function serviceName(
        string $group,
        string $channel
    ): string {
        $label = str_replace(
            '_',
            ' ',
            $group
        );

        return trim(
            $label.' - Kênh '.$channel
        );
    }

    protected function isChannelActive(
        array $channel
    ): bool {
        $status = strtolower(
            trim(
                (string) (
                    $channel['status_text']
                    ?? $channel['status']
                    ?? ''
                )
            )
        );

        if ($status === '') {
            return true;
        }

        foreach ([
            'tắt',
            'tat',
            'ngưng',
            'ngung',
            'bảo trì',
            'bao tri',
            'off',
            'inactive',
            'disabled',
        ] as $word) {
            if (str_contains($status, $word)) {
                return false;
            }
        }

        return true;
    }

    // NOSCAM_SOCIAL_SAFE_V1: validation before HTTP
    public function createOrder(
        string $serviceId,
        string $target,
        int $quantity,
        array $options = []
    ): array {
        $parts = explode(':', $serviceId, 2);

        if (count($parts) !== 2) {
            throw new \App\Services\Social\ProviderOrderRejectedException(
                'VietnamFB service ID không hợp lệ: '.$serviceId
            );
        }

        [$group, $channel] = $parts;

        $group = strtoupper(trim($group));
        $channel = trim($channel);

        if ($channel === '' || !ctype_digit($channel)) {
            throw new \App\Services\Social\ProviderOrderRejectedException(
                'VietnamFB channel_number không hợp lệ.'
            );
        }

        // NOSCAM_VIETNAMFB_FULL_ROUTES_V1
        // Mapping theo Postman Collection VietnamFB.
        $routes = [
            'BUFF_LIKE' => ['buff', 'create', 'id'],
            'BUFF_COMMENT' => ['buff_comment', 'create', 'id'],
            'BUFF_SUB' => ['buff_sub', 'create', 'id'],
            'BUFF_LIVE' => ['buff_live', 'create', 'id'],
            'BUFF_VIEW_NEW' => ['buff_view_new', 'create', 'link'],
            'BUFF_REEL' => ['buff_reel', 'create', 'link_or_id'],
            'LIKE_PAGE2' => ['like_page2', 'create', 'id'],
            'FANPAGE_REVIEW' => ['fanpage_review', 'create', 'id'],
            'STORY_VIEW' => ['story_view', 'create', 'link'],
            'SHARELIVE' => ['sharelive', 'create', 'id'],
            'VIPLIKE' => ['viplike', 'create', 'id'],
            'VIPCMT' => ['vipcmt', 'create', 'id'],
            'VIPMAT' => ['vipmat', 'create', 'id'],
            'VIPSHARELIVE' => ['vipsharelive', 'create', 'id'],
            'INSTAGRAM_SUB' => ['instagram_sub', 'create', 'id'],
            'INSTAGRAM_LIKE' => ['instagram_like', 'create', 'id'],
            'INSTAGRAM_COMMENT' => ['instagram_comment', 'create', 'id'],
            'TIKTOK_SUB' => ['tiktok_sub', 'create', 'link'],
            'PANEL' => ['panel', 'create', 'link'],
            'COVID_LIKEPOST' => ['covid_likepost', 'add_new', 'id'],
            'COVID_LIKEPOST4' => ['covid_likepost4', 'add_new', 'id'],
        ];

        $aliases = [
            'LIKEPAGE_2' => 'LIKE_PAGE2',
            'SHARE_LIVE' => 'SHARELIVE',
            'VIP_LIKE' => 'VIPLIKE',
            'VIP_COMMENT' => 'VIPCMT',
            'VIP_CMT' => 'VIPCMT',
            'VIP_MAT' => 'VIPMAT',
            'VIP_SHARE_LIVE' => 'VIPSHARELIVE',
            'BUFF_SHARELIVE' => 'SHARELIVE',
            'INSTAGRAM_FOLLOW' => 'INSTAGRAM_SUB',
            'TIKTOK_FOLLOW' => 'TIKTOK_SUB',
        ];

        $group = $aliases[$group] ?? $group;

        if (!isset($routes[$group])) {
            throw new \App\Services\Social\ProviderOrderRejectedException(
                'VietnamFB chưa hỗ trợ tạo đơn nhóm: '.$group
            );
        }

        if ($quantity < 1 || trim($target) === '') {
            throw new \App\Services\Social\ProviderOrderRejectedException(
                'VietnamFB yêu cầu ID/link và số lượng hợp lệ.'
            );
        }

        [$mc, $site, $targetField] = $routes[$group];

        $extra = $options['payload'] ?? [];

        if (!is_array($extra)) {
            throw new \App\Services\Social\ProviderOrderRejectedException(
                'VietnamFB payload không hợp lệ.'
            );
        }

        // Cho phép truyền tham số dịch vụ qua options.
        foreach ($options as $key => $value) {
            if (
                $key !== 'payload'
                && $key !== 'comments'
                && !array_key_exists($key, $extra)
            ) {
                $extra[$key] = $value;
            }
        }

        if (isset($options['comments']) && !isset($extra['comments'])) {
            $extra['comments'] = $options['comments'];
        }

        $required = [
            'BUFF_LIVE' => ['mins'],
            'FANPAGE_REVIEW' => ['comments'],
            'BUFF_COMMENT' => ['comments'],
            'INSTAGRAM_COMMENT' => ['comments'],
            'VIPLIKE' => ['package', 'time', 'post_per_day'],
            'VIPCMT' => ['time', 'package', 'post_per_day', 'content'],
            'VIPMAT' => ['time', 'package', 'max_order_per_day', 'max_time_per_order'],
            'VIPSHARELIVE' => ['quantity', 'time', 'totalshare'],
            'TIKTOK_SUB' => ['package_type'],
            'PANEL' => ['service_id'],
        ];

        foreach ($required[$group] ?? [] as $field) {
            $value = $extra[$field] ?? null;

            if (
                $value === null
                || (is_string($value) && trim($value) === '')
            ) {
                throw new \App\Services\Social\ProviderOrderRejectedException(
                    'VietnamFB thiếu tham số bắt buộc: '.$field
                );
            }
        }

        $payload = $extra;

        // Các trường quan trọng không cho payload ghi đè.
        $payload[$targetField] = $target;
        $payload['channel_number'] = $channel;

        if ($group === 'VIPSHARELIVE') {
            // API VIP Share dùng quantity thay vì amount.
            $payload['quantity'] = $quantity;
            unset($payload['amount']);
        } elseif (in_array($group, ['VIPLIKE', 'VIPCMT', 'VIPMAT'], true)) {
            // VIP dùng package/time, không có amount trong tài liệu.
            unset($payload['amount']);
        } else {
            $payload['amount'] = $quantity;
        }

        if (in_array($group, [
            'BUFF_LIKE',
            'COVID_LIKEPOST',
            'COVID_LIKEPOST4',
        ], true)) {
            $payload['reaction'] = $extra['reaction'] ?? 'LIKE';
        }

        if (in_array($group, [
            'BUFF_COMMENT',
            'INSTAGRAM_COMMENT',
            'FANPAGE_REVIEW',
        ], true)) {
            $comments = $payload['comments'] ?? '';

            if (!is_string($comments) || trim($comments) === '') {
                throw new \App\Services\Social\ProviderOrderRejectedException(
                    'Vui lòng nhập nội dung bình luận.'
                );
            }

            if ($group === 'BUFF_COMMENT') {
                $lines = array_values(array_filter(
                    preg_split('/\r\n|\r|\n/', $comments),
                    fn ($line) => trim($line) !== ''
                ));

                if (count($lines) !== $quantity) {
                    throw new \App\Services\Social\ProviderOrderRejectedException(
                        'Số lượng phải bằng số dòng bình luận.'
                    );
                }

                $payload['comments'] = implode("\n", $lines);
            }
        }

        // Chuan hoa URL Instagram Sub truoc khi gui VietnamFB.
        if (
            $group === 'INSTAGRAM_SUB' &&
            isset($payload['id']) &&
            is_string($payload['id'])
        ) {
            $parts = parse_url(trim($payload['id']));

            if (
                is_array($parts) &&
                isset($parts['scheme'], $parts['host'])
            ) {
                $payload['id'] =
                    $parts['scheme'].'://'.$parts['host'].
                    ($parts['path'] ?? '');
            }
        }

        return $this->post($mc, $site, $payload);
    }


    public function probeInstagramOrderStatus(string $orderId): array
    {
        $username = trim((string) $this->username);

        if ($username === '' || trim($orderId) === '') {
            throw new RuntimeException('VietnamFB thieu thong tin.');
        }

        $response = Http::asForm()
            ->acceptJson()
            ->timeout(20)
            ->post(
                $this->endpoint().'?'.http_build_query([
                    'mc' => 'instagram_sub',
                    'site' => 'get_info_order',
                    'username' => $username,
                    'api_key' => $this->apiKey,
                ]),
                ['ids' => $orderId]
            );

        return $this->parseResponse($response);
    }

    public function orderStatus(
        string $orderId
    ): array {
        $response = $this->probeInstagramOrderStatus($orderId);

        if ((int) ($response['success'] ?? 0) !== 1) {
            throw new RuntimeException('VietnamFB status response unsuccessful.');
        }

        $data = $response['data'] ?? null;

        if (!is_array($data) || count($data) !== 1) {
            throw new RuntimeException('VietnamFB status data invalid.');
        }

        $item = $data[0] ?? null;

        if (
            !is_array($item) ||
            (string) ($item['id'] ?? '') !== $orderId
        ) {
            throw new RuntimeException('VietnamFB order ID mismatch.');
        }

        $providerStatus = strtoupper(trim(
            (string) ($item['status'] ?? '')
        ));

        return [
            'status' => match ($providerStatus) {
                'DANG_XU_LY' => 'in_progress',
                default => '',
            },
            'vietnamfb_status' => $providerStatus,
            'vietnamfb_data' => $item,
        ];
    }


    // NOSCAM_VIETNAMFB_AUTO_SYNC_V1
    // Read-only provider status lookup; never submits an order.
    public function orderStatusForService(
        string $orderId,
        string $serviceId
    ): array {
        $group = strtoupper(trim(explode(':', $serviceId, 2)[0]));

        $routes = [
            'BUFF_SUB' => 'buff_sub',
            'BUFF_LIKE' => 'buff_like',
            'BUFF_COMMENT' => 'buff_comment',
            'BUFF_LIVE' => 'buff_live',
            'BUFF_VIEW_NEW' => 'buff_view_new',
            'LIKE_PAGE2' => 'like_page2',
            'LIKEPAGE_2' => 'like_page2',
            'INSTAGRAM_SUB' => 'instagram_sub',
            'INSTAGRAM_FOLLOW' => 'instagram_sub',
            'INSTAGRAM_LIKE' => 'instagram_like',
            'TIKTOK_SUB' => 'tiktok_sub',
            'TIKTOK_FOLLOW' => 'tiktok_sub',
            'VIPLIKE' => 'viplike',
            'VIPCMT' => 'vipcmt',
            'VIPMAT' => 'vipmat',
            'COVID_LIKEPOST' => 'covid_likepost',
            'COVID_LIKEPOST4' => 'covid_likepost4',
        ];

        $mc = $routes[$group] ?? null;

        if ($mc === null) {
            throw new RuntimeException(
                'VietnamFB status route not configured: '.$group
            );
        }

        $username = trim((string) $this->username);

        if (
            $username === '' ||
            trim($this->apiKey) === '' ||
            trim($orderId) === ''
        ) {
            throw new RuntimeException(
                'VietnamFB status credentials/order ID missing.'
            );
        }

        $response = Http::asForm()
            ->acceptJson()
            ->timeout(20)
            ->post(
                $this->endpoint().'?'.http_build_query([
                    'mc' => $mc,
                    'site' => 'get_info_order',
                    'username' => $username,
                    'api_key' => $this->apiKey,
                ]),
                ['ids' => $orderId]
            );

        $json = $this->parseResponse($response);

        if ((int) ($json['success'] ?? 0) !== 1) {
            throw new RuntimeException(
                'VietnamFB status API unsuccessful.'
            );
        }

        $data = $json['data'] ?? null;

        if (
            !is_array($data) ||
            count($data) !== 1 ||
            !isset($data[0]) ||
            !is_array($data[0])
        ) {
            throw new RuntimeException(
                'VietnamFB status response structure invalid.'
            );
        }

        $item = $data[0];

        if ((string) ($item['id'] ?? '') !== $orderId) {
            throw new RuntimeException(
                'VietnamFB status order ID mismatch.'
            );
        }

        $rawStatus = strtoupper(trim(
            (string) ($item['status'] ?? '')
        ));

        $status = match ($rawStatus) {
            'THANH_CONG' => 'completed',
            'DANG_XU_LY' => 'in_progress',
            default => '',
        };

        $result = [
            'status' => $status,
            'vietnamfb_status' => $rawStatus,
            'vietnamfb_data' => $item,
        ];

        if (
            isset($item['first_count']) &&
            ctype_digit((string) $item['first_count'])
        ) {
            $result['start_count'] = (int) $item['first_count'];
        }

        if (
            isset($item['quantity'], $item['run_count']) &&
            ctype_digit((string) $item['quantity']) &&
            ctype_digit((string) $item['run_count'])
        ) {
            $quantity = (int) $item['quantity'];
            $runCount = (int) $item['run_count'];

            if ($quantity > 0 && $runCount <= $quantity) {
                $result['remains'] = $quantity - $runCount;
            }
        }

        return $result;
    }

    public function refill(
        string $orderId
    ): array {
        throw new RuntimeException(
            'VietnamFB chưa cấu hình refill.'
        );
    }

    public function cancel(
        string $orderId
    ): array {
        throw new RuntimeException(
            'VietnamFB chưa cấu hình cancel.'
        );
    }
}
