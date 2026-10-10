<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('digital_orders', function (Blueprint $table) {
            $table->string('guest_request_key', 100)
                ->nullable()
                ->unique();
        });
    }

    public function down(): void
    {
        Schema::table('digital_orders', function (Blueprint $table) {
            $table->dropUnique([
                'guest_request_key',
            ]);

            $table->dropColumn('guest_request_key');
        });
    }
};
