<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('public_evidence_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evidence_id')->unique()->constrained('evidences')->cascadeOnDelete();
            $table->string('file_path');
            $table->boolean('is_public')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('public_evidence_images'); }
};
