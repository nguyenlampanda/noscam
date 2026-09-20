<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();

            $table->foreignId('entity_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            $table->string('scam_type', 100)->nullable();

            $table->string('phone', 30)->nullable();

            $table->string('bank_account', 100)->nullable();

            $table->string('bank', 150)->nullable();

            $table->string('social', 500)->nullable();

            $table->string('website', 500)->nullable();

            $table->text('description')->nullable();

            $table->decimal('loss_amount', 15, 2)->nullable();

            $table->date('occurred_at')->nullable();

            $table->string('status', 30)->default('pending');

            $table->timestamps();

            $table->index('status');
            $table->index('phone');
            $table->index('bank_account');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};