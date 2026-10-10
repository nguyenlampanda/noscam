<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('digital_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')
                ->nullable()
                ->change();

            $table->string('guest_name', 120)->nullable();
            $table->string('guest_phone', 30)->nullable();
            $table->string('guest_email', 255)->nullable();

            $table->string('guest_lookup_hash', 64)
                ->nullable()
                ->unique();

            $table->string('bank_transfer_content', 100)
                ->nullable()
                ->unique();
        });
    }

    public function down(): void
    {
        Schema::table('digital_orders', function (Blueprint $table) {
            $table->dropUnique([
                'guest_lookup_hash',
            ]);

            $table->dropUnique([
                'bank_transfer_content',
            ]);

            $table->dropColumn([
                'guest_name',
                'guest_phone',
                'guest_email',
                'guest_lookup_hash',
                'bank_transfer_content',
            ]);

            $table->unsignedBigInteger('user_id')
                ->nullable(false)
                ->change();
        });
    }
};
