<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exchange_task_prices', function (Blueprint $table) {
            $table->unsignedInteger('min_quantity')->default(10);
        });
    }

    public function down(): void
    {
        Schema::table('exchange_task_prices', function (Blueprint $table) {
            $table->dropColumn('min_quantity');
        });
    }
};
