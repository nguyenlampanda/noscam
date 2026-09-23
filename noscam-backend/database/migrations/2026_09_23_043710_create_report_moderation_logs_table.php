<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'report_moderation_logs',
            function (Blueprint $table) {
                $table->id();

                $table->foreignId('report_id')
                    ->constrained('reports')
                    ->cascadeOnDelete();

                $table->foreignId('user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->string(
                    'from_status',
                    30
                );

                $table->string(
                    'to_status',
                    30
                );

                $table->timestamps();

                $table->index([
                    'report_id',
                    'created_at',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'report_moderation_logs'
        );
    }
};