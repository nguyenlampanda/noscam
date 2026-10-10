<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('digital_orders', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')->restrictOnDelete();

            $table->foreignId('digital_service_id')
                ->constrained('digital_services')->restrictOnDelete();

            $table->string('status', 40)->default('pending');
            $table->string('pricing_type', 20);

            $table->json('request_data')->nullable();
            $table->text('customer_note')->nullable();
            $table->text('admin_note')->nullable();

            $table->decimal('amount_vnd', 18, 4)->nullable();
            $table->string('payment_status', 30)->default('unpaid');
            $table->string('payment_key', 100)->nullable()->unique();

            $table->timestamp('paid_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'payment_status']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('digital_orders');
    }
};
