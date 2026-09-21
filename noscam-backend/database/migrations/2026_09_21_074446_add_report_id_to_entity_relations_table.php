<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'entity_relations',
            function (Blueprint $table) {
                $table->foreignId('report_id')
                    ->nullable()
                    ->after('related_entity_id')
                    ->constrained('reports')
                    ->cascadeOnDelete();

                $table->index('report_id');
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'entity_relations',
            function (Blueprint $table) {
                $table->dropForeign([
                    'report_id',
                ]);

                $table->dropIndex([
                    'report_id',
                ]);

                $table->dropColumn(
                    'report_id'
                );
            }
        );
    }
};