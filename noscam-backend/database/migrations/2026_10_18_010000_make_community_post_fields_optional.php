<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE community_posts MODIFY title VARCHAR(180) NULL');
        DB::statement('ALTER TABLE community_posts MODIFY content TEXT NULL');
    }

    public function down(): void
    {
        DB::statement("UPDATE community_posts SET title = '' WHERE title IS NULL");
        DB::statement("UPDATE community_posts SET content = '' WHERE content IS NULL");
        DB::statement('ALTER TABLE community_posts MODIFY title VARCHAR(180) NOT NULL');
        DB::statement('ALTER TABLE community_posts MODIFY content TEXT NOT NULL');
    }
};
