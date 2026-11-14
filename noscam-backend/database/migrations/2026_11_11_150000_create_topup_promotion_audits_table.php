<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('topup_promotion_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->index();
            $table->foreignId('actor_id')->nullable()->index();
            $table->string('action', 20);
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topup_promotion_audits');
    }
};
