<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bank_webhook_transactions', function (Blueprint $table) {
            $table->id();

            $table->string('provider', 30)->default('sepay');
            $table->string('provider_transaction_id', 150);
            $table->string('bank_account', 100)->nullable();
            $table->string('transfer_type', 20)->nullable();

            $table->decimal('amount', 18, 4);
            $table->text('transfer_content')->nullable();
            $table->timestamp('transacted_at')->nullable();

            $table->string('status', 30)->default('received');

            $table->foreignId('wallet_topup_id')
                ->nullable()
                ->constrained('wallet_topups')
                ->nullOnDelete();

            $table->json('payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('processed_at')->nullable();

            $table->timestamps();

            $table->unique(
                ['provider', 'provider_transaction_id'],
                'bank_webhook_provider_tx_unique'
            );

            $table->index(['status', 'created_at']);
            $table->index('wallet_topup_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_webhook_transactions');
    }
};
