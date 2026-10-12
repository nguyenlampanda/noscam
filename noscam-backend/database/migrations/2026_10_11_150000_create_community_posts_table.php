<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_posts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('title', 180);
            $table->text('content');

            $table->string('category', 40)
                ->default('discussion');

            $table->boolean('is_anonymous')
                ->default(false);

            $table->string('status', 20)
                ->default('pending');

            $table->timestamp('published_at')
                ->nullable();

            $table->timestamps();

            $table->index([
                'status',
                'published_at',
            ]);

            $table->index([
                'user_id',
                'created_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_posts');
    }
};
