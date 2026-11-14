<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('topup_promotion_awards', function (Blueprint $table) {
            $table->id();

            $table->foreignId('topup_promotion_id')
                ->constrained('topup_promotions')
                ->restrictOnDelete();

            $table->foreignId('wallet_topup_id')
                ->constrained('wallet_topups')
                ->restrictOnDelete();

            $table->foreignId('user_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->decimal('topup_amount', 18, 4);
            $table->decimal('bonus_percent', 8, 4);
            $table->decimal('bonus_amount', 18, 4);

            $table->foreignId('wallet_transaction_id')
                ->nullable()
                ->constrained('wallet_transactions')
                ->nullOnDelete();

            $table->timestamp('awarded_at')->nullable();
            $table->timestamps();

            $table->unique(
                'wallet_topup_id',
                'promotion_award_topup_unique'
            );

            $table->unique(
                'wallet_transaction_id',
                'promotion_award_wallet_tx_unique'
            );

            $table->index(['topup_promotion_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topup_promotion_awards');
    }
};
