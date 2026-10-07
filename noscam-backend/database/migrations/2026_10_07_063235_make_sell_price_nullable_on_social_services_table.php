<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'social_services',
            function (Blueprint $table) {
                $table
                    ->decimal(
                        'sell_price_per_1000',
                        18,
                        4
                    )
                    ->nullable()
                    ->change();
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'social_services',
            function (Blueprint $table) {
                $table
                    ->decimal(
                        'sell_price_per_1000',
                        18,
                        4
                    )
                    ->default(0)
                    ->nullable(false)
                    ->change();
            }
        );
    }
};
