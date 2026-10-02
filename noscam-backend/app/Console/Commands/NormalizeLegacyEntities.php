<?php

namespace App\Console\Commands;

use App\Models\Entity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class NormalizeLegacyEntities extends Command
{
    protected $signature = 'noscam:normalize-legacy-entities
                            {--dry-run : Preview changes without modifying the database}';

    protected $description = 'Normalize legacy NoScam entities and safely merge canonical duplicates';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $entities = Entity::query()
            ->whereIn('type', [
                'website',
                'social',
                'bank_account',
            ])
            ->orderBy('id')
            ->get();

        $changes = [];

        foreach ($entities as $entity) {
            $normalized = $this->normalize(
                $entity->type,
                $entity->normalized_value ?: $entity->value
            );

            if ($normalized === '') {
                continue;
            }

            if ($normalized === $entity->normalized_value) {
                continue;
            }

            $target = Entity::query()
                ->where('type', $entity->type)
                ->where('normalized_value', $normalized)
                ->whereKeyNot($entity->id)
                ->first();

            $changes[] = [
                'id' => $entity->id,
                'type' => $entity->type,
                'old' => $entity->normalized_value,
                'new' => $normalized,
                'action' => $target
                    ? "MERGE → #{$target->id}"
                    : 'UPDATE',
            ];
        }

        if ($changes === []) {
            $this->info('Không có legacy entity nào cần chuẩn hóa.');

            return self::SUCCESS;
        }

        $this->table(
            [
                'ID',
                'Type',
                'Current',
                'Canonical',
                'Action',
            ],
            array_map(
                fn (array $change) => [
                    $change['id'],
                    $change['type'],
                    $change['old'],
                    $change['new'],
                    $change['action'],
                ],
                $changes
            )
        );

        if ($dryRun) {
            $this->warn(
                'DRY RUN: database chưa bị thay đổi.'
            );

            return self::SUCCESS;
        }

        DB::transaction(function () use ($entities) {
            foreach ($entities as $entity) {
                $entity = Entity::query()
                    ->lockForUpdate()
                    ->find($entity->id);

                if (! $entity) {
                    continue;
                }

                $normalized = $this->normalize(
                    $entity->type,
                    $entity->normalized_value ?: $entity->value
                );

                if (
                    $normalized === '' ||
                    $normalized === $entity->normalized_value
                ) {
                    continue;
                }

                $target = Entity::query()
                    ->where('type', $entity->type)
                    ->where('normalized_value', $normalized)
                    ->whereKeyNot($entity->id)
                    ->lockForUpdate()
                    ->first();

                if ($target) {
                    $this->mergeEntity(
                        $entity,
                        $target
                    );

                    continue;
                }

                $entity->update([
                    'normalized_value' => $normalized,
                ]);
            }
        });

        $this->newLine();
        $this->info(
            'Legacy normalization hoàn tất.'
        );

        return self::SUCCESS;
    }

    private function mergeEntity(
        Entity $source,
        Entity $target
    ): void {
        /*
         * Merge report pivots.
         *
         * insertOrIgnore prevents violating the unique
         * (entity_id, report_id) constraint.
         */
        $reportIds = DB::table('entity_report')
            ->where('entity_id', $source->id)
            ->pluck('report_id');

        foreach ($reportIds as $reportId) {
            DB::table('entity_report')
                ->insertOrIgnore([
                    'entity_id' => $target->id,
                    'report_id' => $reportId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        /*
         * Relations can have their own unique constraints.
         * Copy with insertOrIgnore instead of blindly
         * updating foreign keys.
         */
        $relations = DB::table('entity_relations')
            ->where(function ($query) use ($source) {
                $query
                    ->where(
                        'entity_id',
                        $source->id
                    )
                    ->orWhere(
                        'related_entity_id',
                        $source->id
                    );
            })
            ->get();

        foreach ($relations as $relation) {
            $entityId =
                $relation->entity_id === $source->id
                    ? $target->id
                    : $relation->entity_id;

            $relatedEntityId =
                $relation->related_entity_id === $source->id
                    ? $target->id
                    : $relation->related_entity_id;

            // Never create self-relations.
            if ($entityId === $relatedEntityId) {
                continue;
            }

            $row = [
                'entity_id' => $entityId,
                'related_entity_id' => $relatedEntityId,
                'relation_type' => $relation->relation_type,
                'created_at' => $relation->created_at ?? now(),
                'updated_at' => now(),
            ];

            /*
             * Newer schema has report_id.
             * Keep compatibility with older rows/schema.
             */
            if (
                property_exists(
                    $relation,
                    'report_id'
                )
            ) {
                $row['report_id'] =
                    $relation->report_id;
            }

            DB::table('entity_relations')
                ->insertOrIgnore($row);
        }

        DB::table('entity_relations')
            ->where('entity_id', $source->id)
            ->orWhere(
                'related_entity_id',
                $source->id
            )
            ->delete();

        DB::table('entity_report')
            ->where('entity_id', $source->id)
            ->delete();

        $source->delete();
    }

    private function normalize(
        string $type,
        ?string $value
    ): string {
        $value = trim((string) $value);

        return match ($type) {
            'website' =>
                $this->normalizeWebsite($value),

            'social' =>
                $this->normalizeSocial($value),

            'bank_account' =>
                preg_replace(
                    '~[^0-9]+~',
                    '',
                    $value
                ) ?? '',

            default =>
                mb_strtolower($value),
        };
    }

    private function normalizeWebsite(
        string $value
    ): string {
        $value = mb_strtolower(
            trim($value)
        );

        $value = preg_replace(
            '~^https?://~i',
            '',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~^www\.~i',
            '',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~[/?#].*$~',
            '',
            $value
        ) ?? $value;

        return rtrim($value, '.');
    }

    private function normalizeSocial(
        string $value
    ): string {
        $value = mb_strtolower(
            trim($value)
        );

        $value = preg_replace(
            '~^https?://~i',
            '',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~^www\.~i',
            '',
            $value
        ) ?? $value;

        $value = preg_replace(
            '~[?#].*$~',
            '',
            $value
        ) ?? $value;

        $value = rtrim($value, '/');

        if (
            str_starts_with(
                $value,
                'm.facebook.com/'
            )
        ) {
            $value =
                'facebook.com/' .
                substr(
                    $value,
                    strlen(
                        'm.facebook.com/'
                    )
                );
        }

        if (
            str_starts_with(
                $value,
                'fb.com/'
            )
        ) {
            $value =
                'facebook.com/' .
                substr(
                    $value,
                    strlen('fb.com/')
                );
        }

        if (
            str_starts_with(
                $value,
                'telegram.me/'
            )
        ) {
            $value =
                't.me/' .
                substr(
                    $value,
                    strlen(
                        'telegram.me/'
                    )
                );
        }

        return $value;
    }
}