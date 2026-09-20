<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entities', function (Blueprint $table) {
            $table->id();

            $table->string('type', 50);
            $table->string('value', 500);

            $table->string('normalized_value', 500);

            $table->unsignedInteger('report_count')->default(0);

            $table->unsignedTinyInteger('risk_score')->default(0);

            $table->string('risk_level', 30)->default('low');

            $table->timestamp('first_detected_at')->nullable();
            $table->timestamp('last_report_at')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->unique(
                ['type', 'normalized_value'],
                'entities_type_value_unique'
            );

            $table->index('normalized_value');
            $table->index('risk_score');
            $table->index('risk_level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entities');
    }
};