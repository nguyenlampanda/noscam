<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('community_posts', function (Blueprint $table) {
            $table->string('title', 180)->nullable()->change();
            $table->text('content')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('community_posts')->whereNull('title')->update(['title' => '']);
        DB::table('community_posts')->whereNull('content')->update(['content' => '']);

        Schema::table('community_posts', function (Blueprint $table) {
            $table->string('title', 180)->nullable(false)->change();
            $table->text('content')->nullable(false)->change();
        });
    }
};
