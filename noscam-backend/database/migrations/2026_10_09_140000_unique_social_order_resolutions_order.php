<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('social_order_resolutions', function (Blueprint $table) {
            $table->unique(
                'social_order_id',
                'social_order_resolutions_order_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('social_order_resolutions', function (Blueprint $table) {
            $table->dropUnique(
                'social_order_resolutions_order_unique'
            );
        });
    }
};
