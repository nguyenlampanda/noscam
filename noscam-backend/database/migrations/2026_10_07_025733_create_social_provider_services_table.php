<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('social_provider_services', function (Blueprint $table) {
            $table->id();

            $table->foreignId('social_provider_id')
                ->constrained('social_providers')
                ->cascadeOnDelete();

            $table->foreignId('social_service_id')
                ->constrained('social_services')
                ->cascadeOnDelete();

            $table->string('provider_service_id');

            $table->string('provider_service_name')->nullable();

            $table->decimal('cost_price_per_1000', 18, 4)->default(0);

            $table->unsignedInteger('min_quantity')->nullable();
            $table->unsignedInteger('max_quantity')->nullable();

            $table->unsignedInteger('priority')->default(100);

            $table->boolean('is_active')->default(true);

            $table->json('provider_data')->nullable();

            $table->timestamp('last_synced_at')->nullable();

            $table->timestamps();

            $table->unique(
                [
                    'social_provider_id',
                    'provider_service_id',
                ],
                'social_provider_service_unique'
            );

            $table->index(
                [
                    'social_service_id',
                    'is_active',
                    'priority',
                ],
                'sps_service_active_priority_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_provider_services');
    }
};
