<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'mediator_mediator_tag',
            function (Blueprint $table) {
                $table->id();

                $table
                    ->foreignId('mediator_id')
                    ->constrained('mediators')
                    ->cascadeOnDelete();

                $table
                    ->foreignId('mediator_tag_id')
                    ->constrained('mediator_tags')
                    ->cascadeOnDelete();

                $table->timestamps();

                $table->unique([
                    'mediator_id',
                    'mediator_tag_id',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'mediator_mediator_tag'
        );
    }
};
