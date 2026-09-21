<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * entity_relations_unique hiện đang được MySQL dùng
         * để hỗ trợ foreign key của entity_id.
         *
         * Vì vậy phải tạo index riêng cho entity_id trước
         * rồi mới được drop unique cũ.
         */
        Schema::table(
            'entity_relations',
            function (Blueprint $table) {
                $table->index(
                    'entity_id',
                    'entity_relations_entity_id_index'
                );
            }
        );

        Schema::table(
            'entity_relations',
            function (Blueprint $table) {
                $table->dropUnique(
                    'entity_relations_unique'
                );
            }
        );

        Schema::table(
            'entity_relations',
            function (Blueprint $table) {
                $table->unique(
                    [
                        'entity_id',
                        'related_entity_id',
                        'relation_type',
                        'report_id',
                    ],
                    'entity_relations_report_unique'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'entity_relations',
            function (Blueprint $table) {
                $table->dropUnique(
                    'entity_relations_report_unique'
                );
            }
        );

        Schema::table(
            'entity_relations',
            function (Blueprint $table) {
                $table->unique(
                    [
                        'entity_id',
                        'related_entity_id',
                        'relation_type',
                    ],
                    'entity_relations_unique'
                );
            }
        );

        Schema::table(
            'entity_relations',
            function (Blueprint $table) {
                $table->dropIndex(
                    'entity_relations_entity_id_index'
                );
            }
        );
    }
};