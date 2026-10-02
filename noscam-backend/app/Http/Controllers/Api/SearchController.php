<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use App\Models\EntityRelation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    private const DISCLAIMER =
        'Risk Score chỉ mang tính cảnh báo dựa trên dữ liệu hệ thống, không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.';

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => [
                'required',
                'string',
                'min:3',
                'max:500',
            ],
        ]);

        $query = trim(
            $request->string('q')->toString()
        );

        $search = $this->detectSearch($query);

        $entity = $this->findEntity($search);

        if ($entity === null) {
            return response()->json([
                'message' =>
                    'Chưa ghi nhận dữ liệu cảnh báo cho thông tin này.',

                'data' => null,

                'meta' => [
                    'query' => $query,

                    'detected_type' =>
                        $search['type'],

                    'detected_type_label' =>
                        $this->typeLabel(
                            $search['type']
                        ),

                    'normalized_query' =>
                        $search['normalized'],

                    'disclaimer' =>
                        self::DISCLAIMER,
                ],
            ]);
        }

        $entity->load(
            'relations.relatedEntity'
        );

        /** @var Collection<int, EntityRelation> $relations */
        $relations = $entity->getRelation(
            'relations'
        );

        $relatedInformation = $relations
            ->map(
                function (
                    EntityRelation $relation
                ): ?array {
                    $relatedEntity =
                        $relation->relatedEntity;

                    if (
                        $relatedEntity === null ||
                        ! $relatedEntity->is_active ||
                        $relatedEntity->report_count <= 0
                    ) {
                        return null;
                    }

                    return [
                        'id' =>
                            $relatedEntity->id,

                        'type' =>
                            $relatedEntity->type,

                        'type_label' =>
                            $this->typeLabel(
                                $relatedEntity->type
                            ),

                        'value' =>
                            $relatedEntity->value,

                        'risk_score' =>
                            $relatedEntity->risk_score,

                        'risk_level' =>
                            $relatedEntity->risk_level,

                        'reports' =>
                            $relatedEntity->report_count,
                    ];
                }
            )
            ->filter()
            ->unique(
                fn (array $item) =>
                    $item['id']
            )
            ->values()
            ->all();

        return response()->json([
            'data' => [
                'type' =>
                    $entity->type,

                'type_label' =>
                    $this->typeLabel(
                        $entity->type
                    ),

                'value' =>
                    $entity->value,

                'normalized_value' =>
                    $entity->normalized_value,

                'risk_score' =>
                    $entity->risk_score,

                'risk_label' =>
                    $this->riskLabel(
                        $entity->risk_level
                    ),

                'risk_level' =>
                    $entity->risk_level,

                'reports' =>
                    $entity->report_count,

                'first_detected' =>
                    $entity
                        ->first_detected_at
                        ?->format('d/m/Y'),

                'last_report' =>
                    $entity
                        ->last_report_at
                        ?->format('d/m/Y'),

                'status' =>
                    'Có dữ liệu cảnh báo',

                'risk_factors' =>
                    $this->riskFactors(
                        $entity
                    ),

                'related_information' =>
                    $relatedInformation,

                'sources' => [
                    'Báo cáo từ cộng đồng',
                    'Dữ liệu cảnh báo của hệ thống',
                ],

                'disclaimer' =>
                    self::DISCLAIMER,
            ],

            'meta' => [
                'query' => $query,

                'detected_type' =>
                    $search['type'],

                'detected_type_label' =>
                    $this->typeLabel(
                        $search['type']
                    ),

                'normalized_query' =>
                    $search['normalized'],

                'matched_type' =>
                    $entity->type,

                'match' =>
                    'exact',
            ],
        ]);
    }

    private function findEntity(
        array $search
    ): ?Entity {
        $base = Entity::query()
            ->where(
                'is_active',
                true
            )
            ->where(
                'report_count',
                '>',
                0
            );

        /*
         * Quan trọng:
         * Khi đã nhận diện được loại dữ liệu,
         * chỉ tìm trong đúng loại đó để tránh
         * số điện thoại match nhầm số tài khoản.
         */
        if ($search['type'] !== 'generic') {
            return (clone $base)
                ->where(
                    'type',
                    $search['type']
                )
                ->where(
                    'normalized_value',
                    $search['normalized']
                )
                ->orderByDesc(
                    'report_count'
                )
                ->orderByDesc(
                    'risk_score'
                )
                ->first();
        }

        /*
         * Generic dùng cho dữ liệu chưa thể
         * xác định chắc chắn loại.
         */
        return (clone $base)
            ->where(
                'normalized_value',
                $search['normalized']
            )
            ->orderByDesc(
                'report_count'
            )
            ->orderByDesc(
                'risk_score'
            )
            ->first();
    }

    private function detectSearch(
        string $query
    ): array {
        $query = trim($query);

        /*
         * Social URL phải kiểm tra trước website,
         * vì facebook.com/... cũng là một URL.
         */
        $socialType =
            $this->detectSocialType(
                $query
            );

        if ($socialType !== null) {
            return [
                'type' => $socialType,
                'normalized' =>
                    $this->normalizeSocial(
                        $query,
                        $socialType
                    ),
            ];
        }

        if ($this->looksLikeWebsite($query)) {
            return [
                'type' => 'website',
                'normalized' =>
                    $this->normalizeWebsite(
                        $query
                    ),
            ];
        }

        if ($this->looksLikePhone($query)) {
            return [
                'type' => 'phone',
                'normalized' =>
                    $this->normalizePhone(
                        $query
                    ),
            ];
        }

        if (
            $this->looksLikeBankAccount(
                $query
            )
        ) {
            return [
                'type' => 'bank_account',
                'normalized' =>
                    $this->normalizeDigits(
                        $query
                    ),
            ];
        }

        return [
            'type' => 'generic',
            'normalized' =>
                $this->normalizeGeneric(
                    $query
                ),
        ];
    }

    private function looksLikePhone(
        string $value
    ): bool {
        $digits =
            $this->normalizeDigits(
                $value
            );

        if ($digits === '') {
            return false;
        }

        /*
         * Số Việt Nam:
         * 0xxxxxxxxx
         * +84xxxxxxxxx
         * 84xxxxxxxxx
         */
        if (
            preg_match(
                '/^0\d{9}$/',
                $digits
            ) === 1
        ) {
            return true;
        }

        if (
            preg_match(
                '/^84\d{9}$/',
                $digits
            ) === 1
        ) {
            return true;
        }

        return false;
    }

    private function looksLikeBankAccount(
        string $value
    ): bool {
        /*
         * Chỉ xem là STK khi input về cơ bản
         * là chuỗi số có thể chứa khoảng trắng,
         * dấu chấm hoặc dấu gạch.
         */
        if (
            preg_match(
                '/^[\d\s.\-]+$/',
                trim($value)
            ) !== 1
        ) {
            return false;
        }

        $digits =
            $this->normalizeDigits(
                $value
            );

        /*
         * MVP:
         * STK thường dài hơn dữ liệu số ngắn.
         * Phone đã được kiểm tra trước.
         */
        $length = strlen($digits);

        return $length >= 6 &&
            $length <= 20;
    }

    private function looksLikeWebsite(
        string $value
    ): bool {
        $value = strtolower(
            trim($value)
        );

        if (
            str_starts_with(
                $value,
                'http://'
            ) ||
            str_starts_with(
                $value,
                'https://'
            ) ||
            str_starts_with(
                $value,
                'www.'
            )
        ) {
            return true;
        }

        return preg_match(
            '/^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:[\/?#].*)?$/i',
            $value
        ) === 1;
    }

    private function detectSocialType(
        string $value
    ): ?string {
        $value = strtolower(
            trim($value)
        );

        $withoutProtocol =
            preg_replace(
                '~^https?://~',
                '',
                $value
            ) ?? $value;

        $withoutProtocol =
            preg_replace(
                '~^www\.~',
                '',
                $withoutProtocol
            ) ?? $withoutProtocol;

        if (
            preg_match(
                '~^(?:m\.)?facebook\.com/~',
                $withoutProtocol
            ) === 1 ||
            preg_match(
                '~^fb\.com/~',
                $withoutProtocol
            ) === 1
        ) {
            return 'facebook';
        }

        if (
            preg_match(
                '~^(?:www\.)?tiktok\.com/~',
                $withoutProtocol
            ) === 1
        ) {
            return 'tiktok';
        }

        if (
            preg_match(
                '~^(?:t\.me|telegram\.me)/~',
                $withoutProtocol
            ) === 1
        ) {
            return 'telegram';
        }

        if (
            preg_match(
                '~^(?:zalo\.me|zalo\.com)/~',
                $withoutProtocol
            ) === 1
        ) {
            return 'zalo';
        }

        /*
         * @username không đủ thông tin để biết
         * thuộc mạng xã hội nào, nên không đoán.
         */
        return null;
    }

    private function normalizeGeneric(
        string $value
    ): string {
        $value = mb_strtolower(
            trim($value)
        );

        return preg_replace(
            '/\s+/',
            '',
            $value
        ) ?? '';
    }

    private function normalizeDigits(
        string $value
    ): string {
        return preg_replace(
            '/\D+/',
            '',
            $value
        ) ?? '';
    }

    private function normalizePhone(
        string $value
    ): string {
        $digits =
            $this->normalizeDigits(
                $value
            );

        if (
            str_starts_with(
                $digits,
                '84'
            ) &&
            strlen($digits) === 11
        ) {
            return '0' .
                substr(
                    $digits,
                    2
                );
        }

        return $digits;
    }

    private function normalizeWebsite(
        string $value
    ): string {
        $value = strtolower(
            trim($value)
        );

        $value =
            preg_replace(
                '~^https?://~',
                '',
                $value
            ) ?? '';

        $value =
            preg_replace(
                '~^www\.~',
                '',
                $value
            ) ?? '';

        /*
         * Entity website của NoScam hiện lưu
         * theo domain, nên bỏ path/query/hash.
         */
        $value =
            preg_replace(
                '~[/?#].*$~',
                '',
                $value
            ) ?? '';

        return rtrim(
            $value,
            '.'
        );
    }

    private function normalizeSocial(
        string $value,
        string $type
    ): string {
        $value = strtolower(
            trim($value)
        );

        $value =
            preg_replace(
                '~^https?://~',
                '',
                $value
            ) ?? '';

        $value =
            preg_replace(
                '~^www\.~',
                '',
                $value
            ) ?? '';

        $value =
            preg_replace(
                '~[?#].*$~',
                '',
                $value
            ) ?? '';

        $value = rtrim(
            $value,
            '/'
        );

        /*
         * Giữ dạng domain/path vì dữ liệu entity
         * hiện tại có thể đang được lưu theo link.
         * Chưa ép chỉ còn username để tránh phá
         * compatibility với dữ liệu cũ.
         */
        return match ($type) {
            'facebook',
            'tiktok',
            'telegram',
            'zalo' => $value,

            default => $value,
        };
    }

    private function typeLabel(
        string $type
    ): string {
        return match ($type) {
            'phone' =>
                'Số điện thoại',

            'bank_account' =>
                'Số tài khoản ngân hàng',

            'website' =>
                'Website / tên miền',

            'facebook' =>
                'Facebook',

            'tiktok' =>
                'TikTok',

            'telegram' =>
                'Telegram',

            'zalo' =>
                'Zalo',

            'social' =>
                'Mạng xã hội',

            'shop' =>
                'Shop / người bán',

            'rental' =>
                'Phòng trọ / người cho thuê',

            'recruitment' =>
                'Tuyển dụng',

            default =>
                'Thông tin',
        };
    }

    private function riskLabel(
        string $level
    ): string {
        return match ($level) {
            'safe' =>
                'Chưa ghi nhận rủi ro',

            'low' =>
                'Rủi ro thấp',

            'medium' =>
                'Rủi ro trung bình',

            'high' =>
                'Rủi ro cao',

            'dangerous' =>
                'Rủi ro rất cao',

            default =>
                'Chưa xác định',
        };
    }

    private function riskFactors(
        Entity $entity
    ): array {
        $factors = [];

        if (
            $entity->report_count > 0
        ) {
            $factors[] = [
                'id' => 1,

                'title' =>
                    'Có báo cáo từ cộng đồng',

                'description' =>
                    "Hệ thống hiện ghi nhận {$entity->report_count} báo cáo liên quan.",

                'severity' =>
                    $entity->report_count >= 5
                        ? 'high'
                        : 'medium',
            ];
        }

        if (
            $entity->last_report_at !== null
        ) {
            $factors[] = [
                'id' => 2,

                'title' =>
                    'Có lịch sử báo cáo',

                'description' =>
                    'Thông tin này đã xuất hiện trong dữ liệu báo cáo của hệ thống.',

                'severity' =>
                    'medium',
            ];
        }

        return $factors;
    }
}
