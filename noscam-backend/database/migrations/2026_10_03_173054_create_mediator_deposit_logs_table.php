<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mediator_deposit_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('mediator_id')
                ->constrained('mediators')
                ->cascadeOnDelete();

            $table->foreignId('admin_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->bigInteger('amount');
            $table->string('note', 500)->nullable();
            $table->date('recorded_at');

            $table->timestamps();

            $table->index([
                'mediator_id',
                'recorded_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mediator_deposit_logs');
    }
};
