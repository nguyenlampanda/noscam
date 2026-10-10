<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_order_payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('digital_order_id')
                ->constrained('digital_orders')
                ->restrictOnDelete();

            $table->string('method', 30);

            $table->decimal('amount_vnd', 18, 4);

            $table->string('status', 30)
                ->default('pending');

            $table->string('bank_reference', 255)
                ->nullable()
                ->unique();

            $table->foreignId('wallet_transaction_id')
                ->nullable()
                ->unique()
                ->constrained('wallet_transactions')
                ->restrictOnDelete();

            $table->foreignId('confirmed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('confirmed_at')
                ->nullable();

            $table->text('note')
                ->nullable();

            $table->timestamps();

            $table->index([
                'digital_order_id',
                'status',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_order_payments');
    }
};
