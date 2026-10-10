<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_order_status_histories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('digital_order_id')
                ->constrained('digital_orders')
                ->restrictOnDelete();

            $table->foreignId('admin_user_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->string('old_status', 40);
            $table->string('new_status', 40);
            $table->text('note')->nullable();

            $table->timestamps();

            $table->index([
                'digital_order_id',
                'created_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_order_status_histories');
    }
};
