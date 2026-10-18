<?php

namespace App\Services\Exchange;

use App\Models\ExchangeCampaign;
use App\Models\ExchangeTaskPrice;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ExchangeCampaignService
{
    public function create(
        User $owner,
        string $platform,
        string $taskType,
        string $targetUrl,
        int $quantity,
        bool $rulesAccepted,
        ?string $idempotencyKey = null,
        ?int $maxBudget = null
    ): ExchangeCampaign {
        if (!in_array($platform, [
            'instagram', 'tiktok', 'facebook',
        ], true)) {
            throw ValidationException::withMessages([
                'platform' => 'Nền tảng không hợp lệ.',
            ]);
        }

        if (!in_array($taskType, [
            'follow', 'like', 'comment',
        ], true)) {
            throw ValidationException::withMessages([
                'task_type' => 'Loại nhiệm vụ không hợp lệ.',
            ]);
        }

        if ($quantity < 1 || $quantity > 100000) {
            throw ValidationException::withMessages([
                'quantity' => 'Số lượng phải từ 1 đến 100.000.',
            ]);
        }

        if (!$rulesAccepted) {
            throw ValidationException::withMessages([
                'rules_accepted' => 'Bạn cần đồng ý điều khoản.',
            ]);
        }

        $targetUrl = trim($targetUrl);

        if ($idempotencyKey !== null && !preg_match(
            '/^[A-Za-z0-9_-]{16,128}$/',
            $idempotencyKey
        )) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Mã yêu cầu không hợp lệ.',
            ]);
        }

        $requestHash = $idempotencyKey === null
            ? null
            : hash('sha256', json_encode([
                'platform' => $platform,
                'task_type' => $taskType,
                'target_url' => $targetUrl,
                'quantity' => $quantity,
                'rules_accepted' => $rulesAccepted,
            ], JSON_THROW_ON_ERROR));

        if (
            strlen($targetUrl) > 2048
            || !filter_var($targetUrl, FILTER_VALIDATE_URL)
        ) {
            throw ValidationException::withMessages([
                'target_url' => 'Liên kết nhiệm vụ không hợp lệ.',
            ]);
        }

        $parts = parse_url($targetUrl);
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = strtolower(rtrim($parts['host'] ?? '', '.'));

        $allowedHosts = match ($platform) {
            'instagram' => ['instagram.com'],
            'tiktok' => ['tiktok.com'],
            'facebook' => ['facebook.com', 'fb.com'],
        };

        $validHost = false;

        foreach ($allowedHosts as $allowedHost) {
            if (
                $host === $allowedHost
                || str_ends_with($host, '.' . $allowedHost)
            ) {
                $validHost = true;
                break;
            }
        }

        if (
            $scheme !== 'https'
            || !$validHost
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['port'])
        ) {
            throw ValidationException::withMessages([
                'target_url' => 'Liên kết không đúng nền tảng.',
            ]);
        }

        return DB::transaction(function () use (
            $owner,
            $platform,
            $taskType,
            $targetUrl,
            $quantity,
            $idempotencyKey,
            $requestHash,
            $maxBudget
        ) {
            // Serialize campaign creation for this owner.
            User::query()
                ->whereKey($owner->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($idempotencyKey !== null) {
                $existing = ExchangeCampaign::query()
                    ->where('user_id', $owner->id)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing) {
                    if ($existing->request_hash !== $requestHash) {
                        throw new HttpResponseException(
                            response()->json([
                                'message' =>
                                    'Idempotency-Key đã được dùng cho nội dung khác.',
                                'errors' => [
                                    'idempotency_key' => [
                                        'Mã yêu cầu đã được dùng cho nội dung khác.',
                                    ],
                                ],
                            ], 409)
                        );
                    }

                    return $existing;
                }
            }

            $price = ExchangeTaskPrice::query()
                ->where('platform', $platform)
                ->where('task_type', $taskType)
                ->lockForUpdate()
                ->first();

            if (!$price || !$price->is_enabled) {
                throw ValidationException::withMessages([
                    'task_type' => 'Nhiệm vụ hiện chưa được mở.',
                ]);
            }

            $minimum = (int) $price->min_quantity;

            if ($quantity < $minimum) {
                throw ValidationException::withMessages([
                    'quantity' => 'Số lượng tối thiểu là ' . $minimum . ' lượt.',
                ]);
            }

            $cost = $this->wholeAmount($price->cost_per_task);
            $reward = $this->wholeAmount($price->reward_per_task);

            if ($reward > $cost) {
                throw new RuntimeException(
                    'Bảng giá nhiệm vụ không hợp lệ.'
                );
            }

            if ($quantity > intdiv(PHP_INT_MAX, $cost)) {
                throw ValidationException::withMessages([
                    'quantity' => 'Ngân sách vượt giới hạn.',
                ]);
            }

            $total = $quantity * $cost;

            if ($maxBudget !== null && $total > $maxBudget) {
                throw ValidationException::withMessages([
                    'max_budget' =>
                        'Giá nhiệm vụ đã tăng. Vui lòng kiểm tra và xác nhận lại ngân sách.',
                ]);
            }

            // Giới hạn theo độ chính xác của cột DECIMAL(18,4).
            if ($total > 99999999999999) {
                throw ValidationException::withMessages([
                    'quantity' => 'Ngân sách vượt giới hạn.',
                ]);
            }

            $campaign = ExchangeCampaign::create([
                'user_id' => $owner->id,
                'social_account_id' => null,
                'platform' => $platform,
                'task_type' => $taskType,
                'target_url' => $targetUrl,
                'quantity' => $quantity,
                'cost_per_task' => $cost,
                'reward_per_task' => $reward,
                'budget_total' => $total,
                'budget_held' => 0,
                'budget_settled' => 0,
                'budget_refunded' => 0,
                'status' => 'draft',
                'rules_accepted' => true,
                'rules_accepted_at' => now(),
                'idempotency_key' => $idempotencyKey,
                'request_hash' => $requestHash,
            ]);

            app(ExchangeEscrowService::class)
                ->holdCampaignBudget($campaign);

            return $campaign->refresh();
        }, 3);
    }

    private function wholeAmount(mixed $value): int
    {
        $text = (string) $value;

        if (!preg_match('/^[0-9]+(?:\.0{1,4})?$/', $text)) {
            throw new RuntimeException(
                'Bảng giá phải sử dụng số xu nguyên.'
            );
        }

        $integer = explode('.', $text, 2)[0];

        if (
            strlen($integer) > 14
            || (float) $integer > PHP_INT_MAX
        ) {
            throw new RuntimeException(
                'Giá nhiệm vụ vượt giới hạn.'
            );
        }

        $amount = (int) $integer;

        if ($amount <= 0) {
            throw new RuntimeException(
                'Giá nhiệm vụ phải lớn hơn 0.'
            );
        }

        return $amount;
    }
}
