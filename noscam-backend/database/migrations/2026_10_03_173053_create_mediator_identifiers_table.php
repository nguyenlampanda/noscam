<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mediator_identifiers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('mediator_id')
                ->constrained('mediators')
                ->cascadeOnDelete();

            $table->enum('type', [
                'phone',
                'bank_account',
                'facebook',
                'zalo',
                'telegram',
                'other',
            ]);

            $table->string('value', 500);
            $table->string('normalized_value', 500);
            $table->string('label', 150)->nullable();
            $table->string('bank_name', 150)->nullable();
            $table->boolean('is_public')->default(true);

            $table->timestamps();

            $table->index([
                'type',
                'normalized_value',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mediator_identifiers');
    }
};
