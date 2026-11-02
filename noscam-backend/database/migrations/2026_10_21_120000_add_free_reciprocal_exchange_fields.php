<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('exchange_campaigns', function (Blueprint $table) {
            // Existing campaigns remain paid; only explicitly new campaigns become free.
            $table->boolean('is_free_reciprocal')->default(false);
        });
        Schema::table('exchange_task_claims', function (Blueprint $table) {
            $table->string('reciprocal_status', 30)->nullable();
            $table->foreignId('reciprocal_social_account_id')->nullable()
                ->constrained('exchange_social_accounts')->nullOnDelete();
            $table->timestamp('reciprocal_submitted_at')->nullable();
            $table->timestamp('reciprocal_confirmed_at')->nullable();
            $table->index(['reciprocal_status', 'created_at'], 'exchange_claim_reciprocal_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('exchange_task_claims', function (Blueprint $table) {
            $table->dropIndex('exchange_claim_reciprocal_status_idx');
            $table->dropConstrainedForeignId('reciprocal_social_account_id');
            $table->dropColumn([
                'reciprocal_status', 'reciprocal_submitted_at',
                'reciprocal_confirmed_at',
            ]);
        });
        Schema::table('exchange_campaigns', function (Blueprint $table) {
            $table->dropColumn('is_free_reciprocal');
        });
    }
};
