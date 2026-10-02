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
                'submission_fingerprint',
                64
            )->nullable()->after('status');

            $table->index(
                [
                    'submission_fingerprint',
                    'created_at',
                ],
                'reports_fingerprint_created_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex(
                'reports_fingerprint_created_index'
            );

            $table->dropColumn(
                'submission_fingerprint'
            );
        });
    }
};