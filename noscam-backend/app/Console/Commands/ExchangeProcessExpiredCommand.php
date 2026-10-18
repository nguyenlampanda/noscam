<?php

namespace App\Console\Commands;

use App\Models\ExchangeTaskClaim;
use App\Services\Exchange\ExchangeAutoSettlementService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class ExchangeProcessExpiredCommand extends Command
{
    protected $signature = 'exchange:process-expired
        {--limit=50 : Số nhiệm vụ tối đa mỗi lượt}';

    protected $description =
        'Tự động thanh toán hoặc hoàn xu nhiệm vụ Exchange quá hạn';

    public function handle(ExchangeAutoSettlementService $service): int
    {
        $limit = filter_var(
            $this->option('limit'),
            FILTER_VALIDATE_INT
        );

        if ($limit === false || $limit < 1 || $limit > 500) {
            $this->error('Limit phải nằm trong khoảng 1 đến 500.');

            return self::FAILURE;
        }

        $now = now();

        // Đây chỉ là bộ lọc ứng viên.
        // Điều kiện thanh toán được kiểm tra lại bên trong transaction.
        $claims = ExchangeTaskClaim::query()
            ->where('risk_hold', false)
            ->where(function ($query) use ($now) {
                $query->where(function ($submitted) use ($now) {
                    $submitted
                        ->where('status', 'submitted')
                        ->whereNotNull('review_deadline_at')
                        ->where('review_deadline_at', '<=', $now);
                })->orWhere(function ($rejected) use ($now) {
                    $rejected
                        ->where('status', 'rejected')
                        ->whereNotNull('appeal_deadline_at')
                        ->where('appeal_deadline_at', '<=', $now);
                });
            })
            ->whereDoesntHave('dispute')
            ->orderBy('id')
            ->limit($limit)
            ->get(['id']);

        $approved = 0;
        $refunded = 0;
        $failed = 0;

        foreach ($claims as $claim) {
            try {
                $result = $service->processClaim((int) $claim->id);

                if ($result === 'approved') {
                    $approved++;
                } elseif ($result === 'refunded') {
                    $refunded++;
                }
            } catch (Throwable $exception) {
                $failed++;

                Log::warning('Exchange auto settlement failed', [
                    'claim_id' => $claim->id,
                    'exception' => get_class($exception),
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        $this->info(
            "Exchange: approved={$approved}, "
            ."refunded={$refunded}, failed={$failed}"
        );

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
