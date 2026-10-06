<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mediators', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();

            $table->enum('status', [
                'active',
                'suspended',
                'removed',
            ])->default('active');

            $table->boolean('is_public')->default(true);
            $table->text('admin_note')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'is_public']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mediators');
    }
};
