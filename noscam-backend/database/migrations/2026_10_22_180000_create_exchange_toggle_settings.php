<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('exchange_toggle_settings', function (Blueprint $table) {
            $table->id();
            $table->string('platform', 40);
            $table->string('task_type', 40);
            $table->boolean('is_enabled')->default(false);
            $table->foreignId('updated_by')->nullable();
            $table->timestamps();
            $table->unique(['platform', 'task_type'], 'exchange_toggle_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_toggle_settings');
    }
};
