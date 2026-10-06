<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'community_feedbacks',
            function (Blueprint $table) {
                $table->id();

                $table->string(
                    'entity_type',
                    50
                );

                $table->string(
                    'normalized_value',
                    500
                );

                $table->string(
                    'feedback_type',
                    30
                );

                /*
                 * Hash nguồn gửi.
                 * Không lưu IP thô.
                 */
                $table->string(
                    'source_hash',
                    64
                );

                $table->timestamps();

                $table->index(
                    [
                        'entity_type',
                        'normalized_value',
                    ],
                    'community_feedback_lookup'
                );

                /*
                 * Một nguồn chỉ có một lựa chọn
                 * cho cùng một thông tin.
                 */
                $table->unique(
                    [
                        'entity_type',
                        'normalized_value',
                        'source_hash',
                    ],
                    'community_feedback_unique_source'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'community_feedbacks'
        );
    }
};
