<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('exchange_task_claims', function (Blueprint $table) {
            $table->foreignId('return_campaign_id')->nullable()
                ->constrained('exchange_campaigns')->nullOnDelete();
            $table->index(['return_campaign_id', 'reciprocal_status'], 'exchange_return_campaign_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('exchange_task_claims', function (Blueprint $table) {
            $table->dropIndex('exchange_return_campaign_status_idx');
            $table->dropConstrainedForeignId('return_campaign_id');
        });
    }
};
