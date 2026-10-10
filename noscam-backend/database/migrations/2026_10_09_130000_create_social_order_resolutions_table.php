<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('social_order_resolutions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('social_order_id')
                ->constrained('social_orders')
                ->restrictOnDelete();

            $table->foreignId('social_order_audit_id')
                ->unique()
                ->constrained('social_order_audits')
                ->restrictOnDelete();

            $table->foreignId('admin_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('action', 50);
            $table->string('status_before', 50);
            $table->string('status_after', 50);

            $table->string('provider_order_id')->nullable();
            $table->decimal('refund_amount', 18, 4)->default(0);

            $table->text('note')->nullable();

            $table->timestamps();

            $table->index(['social_order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_order_resolutions');
    }
};
