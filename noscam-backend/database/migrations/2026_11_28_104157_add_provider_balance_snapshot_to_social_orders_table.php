<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_orders', function (Blueprint $table) {
            $table->decimal('provider_balance_snapshot_vnd', 20, 4)->nullable();
            $table->timestamp('provider_balance_snapshot_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('social_orders', function (Blueprint $table) {
            $table->dropColumn([
                'provider_balance_snapshot_vnd',
                'provider_balance_snapshot_at',
            ]);
        });
    }
};
