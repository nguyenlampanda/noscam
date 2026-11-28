<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_providers', function (Blueprint $table) {
            $table->decimal('wallet_balance_vnd', 20, 4)->nullable();
            $table->timestamp('wallet_checked_at')->nullable();
            $table->string('wallet_group', 100)->nullable()->index();
            $table->text('wallet_error')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('social_providers', function (Blueprint $table) {
            $table->dropIndex(['wallet_group']);
            $table->dropColumn([
                'wallet_balance_vnd',
                'wallet_checked_at',
                'wallet_group',
                'wallet_error',
            ]);
        });
    }
};
