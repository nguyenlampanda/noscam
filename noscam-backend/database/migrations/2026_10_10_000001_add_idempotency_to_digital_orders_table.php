<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('digital_orders', function (Blueprint $table) {
            $table->string('idempotency_key', 100)
                ->nullable();

            $table->string('request_hash', 64)
                ->nullable();

            $table->unique(
                ['user_id', 'idempotency_key'],
                'digital_orders_user_idempotency_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('digital_orders', function (Blueprint $table) {
            $table->dropUnique(
                'digital_orders_user_idempotency_unique'
            );

            $table->dropColumn([
                'idempotency_key',
                'request_hash',
            ]);
        });
    }
};
