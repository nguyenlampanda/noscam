<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('digital_quotes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('digital_order_id')
                ->constrained('digital_orders')->restrictOnDelete();

            $table->foreignId('admin_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->decimal('amount_vnd', 18, 4);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('pending');

            $table->timestamp('expires_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->index(['digital_order_id', 'status']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('digital_quotes');
    }
};
