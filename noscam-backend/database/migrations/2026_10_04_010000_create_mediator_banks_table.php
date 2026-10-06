<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'mediator_banks',
            function (Blueprint $table) {
                $table->id();

                $table
                    ->string('name', 150)
                    ->unique();

                $table
                    ->string('slug', 180)
                    ->unique();

                $table
                    ->boolean('is_active')
                    ->default(true);

                $table
                    ->unsignedInteger('sort_order')
                    ->default(0);

                $table->timestamps();

                $table->index([
                    'is_active',
                    'sort_order',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'mediator_banks'
        );
    }
};
