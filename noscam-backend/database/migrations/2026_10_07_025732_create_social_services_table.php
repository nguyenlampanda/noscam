<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('social_services', function (Blueprint $table) {
            $table->id();

            $table->string('code')->unique();

            $table->enum('platform', [
                'facebook',
                'instagram',
                'tiktok',
                'other',
            ]);

            $table->string('category');
            $table->string('name');

            $table->text('description')->nullable();

            $table->unsignedInteger('min_quantity')->default(1);
            $table->unsignedInteger('max_quantity')->default(1000000);

            $table->decimal('sell_price_per_1000', 18, 4);

            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);

            $table->json('settings')->nullable();

            $table->timestamps();

            $table->index([
                'platform',
                'is_active',
                'sort_order',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_services');
    }
};
