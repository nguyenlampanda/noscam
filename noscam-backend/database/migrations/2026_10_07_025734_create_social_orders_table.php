<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('social_orders', function (Blueprint $table) {
            $table->id();

            $table->string('code')->unique();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('social_service_id')
                ->constrained('social_services')
                ->restrictOnDelete();

            $table->foreignId('social_provider_id')
                ->nullable()
                ->constrained('social_providers')
                ->nullOnDelete();

            $table->foreignId('social_provider_service_id')
                ->nullable()
                ->constrained('social_provider_services')
                ->nullOnDelete();

            $table->string('provider_order_id')->nullable();

            $table->text('target');

            $table->unsignedInteger('quantity');

            $table->decimal('sell_amount', 18, 4);
            $table->decimal('cost_amount', 18, 4)->default(0);
            $table->decimal('profit_amount', 18, 4)->default(0);

            $table->enum('status', [
                'pending',
                'processing',
                'in_progress',
                'completed',
                'partial',
                'cancelled',
                'failed',
            ])->default('pending');

            $table->unsignedBigInteger('start_count')->nullable();
            $table->unsignedInteger('remains')->nullable();

            $table->decimal('refunded_amount', 18, 4)->default(0);

            $table->string('idempotency_key')->nullable()->unique();

            $table->unsignedInteger('attempts')->default(0);

            $table->text('provider_error')->nullable();

            $table->json('provider_response')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();

            $table->timestamps();

            $table->index([
                'user_id',
                'status',
                'created_at',
            ]);

            $table->index([
                'social_provider_id',
                'provider_order_id',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_orders');
    }
};
