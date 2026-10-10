<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('social_order_audits', function (Blueprint $table) {
            $table->id();

            $table->foreignId('social_order_id')
                ->constrained('social_orders')
                ->cascadeOnDelete();

            $table->foreignId('admin_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('result', 50);
            $table->string('provider_order_id')->nullable();

            $table->text('note');
            $table->text('evidence')->nullable();

            $table->timestamps();

            $table->index([
                'social_order_id',
                'created_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_order_audits');
    }
};
