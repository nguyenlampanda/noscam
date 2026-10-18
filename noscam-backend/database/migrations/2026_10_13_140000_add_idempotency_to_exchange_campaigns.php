<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exchange_campaigns', function (Blueprint $table) {
            $table->string('idempotency_key', 128)->nullable();
            $table->char('request_hash', 64)->nullable();

            $table->unique(
                ['user_id', 'idempotency_key'],
                'exchange_campaign_user_idempotency_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('exchange_campaigns', function (Blueprint $table) {
            $table->dropUnique(
                'exchange_campaign_user_idempotency_unique'
            );

            $table->dropColumn([
                'idempotency_key',
                'request_hash',
            ]);
        });
    }
};
