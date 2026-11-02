<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('exchange_social_accounts', function (Blueprint $table) {
            $table->boolean('can_receive')->default(true);
            $table->boolean('can_perform')->default(true);
        });
        Schema::table('exchange_task_claims', function (Blueprint $table) {
            $table->string('return_username', 191)->nullable();
            $table->string('return_profile_url', 2048)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('exchange_task_claims', function (Blueprint $table) {
            $table->dropColumn(['return_username', 'return_profile_url']);
        });
        Schema::table('exchange_social_accounts', function (Blueprint $table) {
            $table->dropColumn(['can_receive', 'can_perform']);
        });
    }
};
