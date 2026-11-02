<?php

namespace App\Console\Commands;

use App\Models\ExchangeTaskClaim;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class BackfillExchangeFreeInteractionKeys extends Command
{
    protected $signature = 'exchange:backfill-free-keys {--dry-run}';
    protected $description = 'Backfill unique interaction keys for free reciprocal exchange';

    private function targetKey($campaign): string
    {
        $url = trim((string) $campaign->target_url);
        $parts = parse_url($url);

        if (is_array($parts) && !empty($parts['host'])) {
            $host = strtolower($parts['host']);
            $host = preg_replace('/^www\./', '', $host);

            $path = rawurldecode($parts['path'] ?? '');
            $path = preg_replace('#/+#', '/', $path);
            $path = strtolower(trim($path, '/'));

            return strtolower(
                $campaign->platform.'|'.
                $campaign->task_type.'|'.
                $host.$path
            );
        }

        return strtolower(
            $campaign->platform.'|'.
            $campaign->task_type.'|'.
            $url
        );
    }

    public function handle(): int
    {
        $claims = ExchangeTaskClaim::query()
            ->whereHas('campaign', fn ($q) =>
                $q->where('is_free_reciprocal', true))
            ->with('campaign')
            ->get()
            ->sort(function ($a, $b) {
                $aConfirmed = $a->reciprocal_status === 'confirmed' ? 0 : 1;
                $bConfirmed = $b->reciprocal_status === 'confirmed' ? 0 : 1;

                return [$aConfirmed, $a->id] <=> [$bConfirmed, $b->id];
            });

        $keys = [];

        foreach ($claims as $claim) {
            if (!$claim->campaign) {
                continue;
            }

            $hash = hash('sha256', $this->targetKey($claim->campaign));
            $key = $claim->social_account_id.'|'.$hash;

            if (!isset($keys[$key])) {
                $keys[$key] = [
                    'social_account_id' => $claim->social_account_id,
                    'claim_id' => $claim->id,
                    'target_hash' => $hash,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        $this->info('Free claims: '.$claims->count());
        $this->info('Unique keys: '.count($keys));
        $this->info('Duplicate claims: '.($claims->count() - count($keys)));

        if ($this->option('dry-run')) {
            $this->warn('DRY RUN: Không thay đổi database.');
            return self::SUCCESS;
        }

        try {
            DB::transaction(function () use ($keys) {
                $table = DB::table('exchange_free_interaction_keys');

                if ($table->count() !== 0) {
                    throw new \RuntimeException(
                        'Bảng khóa không trống. Dừng để tránh ghi đè dữ liệu.'
                    );
                }

                foreach ($keys as $row) {
                    DB::table('exchange_free_interaction_keys')
                        ->insert($row);
                }

                if (DB::table('exchange_free_interaction_keys')->count()
                    !== count($keys)) {
                    throw new \RuntimeException(
                        'Số khóa không khớp. Rollback.'
                    );
                }
            });

            $this->info('Backfill hoàn tất.');
            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error('Backfill thất bại: '.$e->getMessage());
            return self::FAILURE;
        }
    }
}
