<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('digital_services', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100)->unique();
            $table->string('category', 100)->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('pricing_type', 20);
            $table->decimal('price_vnd', 18, 4)->nullable();
            $table->string('platform', 50)->nullable();
            $table->json('requirements')->nullable();
            $table->boolean('is_active')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('digital_services');
    }
};
