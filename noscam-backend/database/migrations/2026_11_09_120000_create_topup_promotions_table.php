<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('topup_promotions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('mode', 30);
            $table->boolean('is_enabled')->default(false);

            $table->decimal('bonus_percent', 8, 4);
            $table->decimal('min_topup', 18, 4)->default(0);
            $table->decimal('max_bonus', 18, 4)->nullable();

            $table->unsignedInteger('max_uses_per_user')->nullable();
            $table->unsignedInteger('max_total_uses')->nullable();

            $table->json('weekdays')->nullable();
            $table->json('month_days')->nullable();
            $table->json('specific_dates')->nullable();

            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();

            $table->string('timezone', 64)
                ->default('Asia/Ho_Chi_Minh');

            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['mode', 'is_enabled']);
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topup_promotions');
    }
};
