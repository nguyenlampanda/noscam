<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('site_popups', function (Blueprint $table) {
            $table->id();
            $table->string('title', 180);
            $table->text('content');
            $table->json('pages');
            $table->string('image_url', 2048)->nullable();
            $table->string('button_text', 100)->nullable();
            $table->string('button_url', 2048)->nullable();
            $table->boolean('is_active')->default(false);
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
            $table->index(['is_active', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('site_popups');
    }
};
