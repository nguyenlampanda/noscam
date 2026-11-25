<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notification_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('section', 50);
            $table->string('item_key', 100);
            $table->timestamp('read_at');
            $table->unique(['user_id', 'section', 'item_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notification_reads');
    }
};
