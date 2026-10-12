<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_comments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('post_id')
                ->constrained('community_posts')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('community_comments')
                ->nullOnDelete();

            $table->text('content');

            $table->boolean('is_anonymous')
                ->default(false);

            $table->string('status', 20)
                ->default('pending');

            $table->timestamps();

            $table->index(['post_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_comments');
    }
};
