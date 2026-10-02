<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->string(
                'submitter_hash',
                64
            )->nullable()->after(
                'submission_fingerprint'
            );

            $table->index(
                [
                    'submitter_hash',
                    'submission_fingerprint',
                    'created_at',
                ],
                'reports_submitter_fingerprint_created_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex(
                'reports_submitter_fingerprint_created_index'
            );

            $table->dropColumn(
                'submitter_hash'
            );
        });
    }
};