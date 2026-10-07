<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('social_providers', function (Blueprint $table) {
            $table->id();

            $table->string('name');
            $table->string('slug')->unique();

            $table->string('driver');
            $table->string('api_url');
            $table->text('api_key')->nullable();

            $table->enum('status', [
                'active',
                'inactive',
                'error',
            ])->default('inactive');

            $table->decimal('balance', 18, 4)->default(0);
            $table->string('currency', 10)->default('VND');

            $table->unsignedInteger('priority')->default(100);

            $table->boolean('auto_sync')->default(true);

            $table->timestamp('last_checked_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();

            $table->text('last_error')->nullable();

            $table->json('settings')->nullable();

            $table->timestamps();

            $table->index(['status', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_providers');
    }
};
