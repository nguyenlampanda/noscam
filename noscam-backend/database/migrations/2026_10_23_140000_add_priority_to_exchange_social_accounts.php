<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exchange_social_accounts', function (Blueprint $table) {
            $table->unsignedSmallInteger('priority')->default(100);
        });
    }

    public function down(): void
    {
        Schema::table('exchange_social_accounts', function (Blueprint $table) {
            $table->dropColumn('priority');
        });
    }
};
