<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('social_orders', function (Blueprint $table) {
            $table->json('order_options')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('social_orders', function (Blueprint $table) {
            $table->dropColumn('order_options');
        });
    }
};
