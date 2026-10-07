<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_providers', function (Blueprint $table) {
            $table->decimal(
                'exchange_rate_to_vnd',
                18,
                4
            )->default(1)->after('currency');

            $table->decimal(
                'price_multiplier',
                18,
                6
            )->default(1)->after(
                'exchange_rate_to_vnd'
            );
        });
    }

    public function down(): void
    {
        Schema::table('social_providers', function (Blueprint $table) {
            $table->dropColumn([
                'exchange_rate_to_vnd',
                'price_multiplier',
            ]);
        });
    }
};
