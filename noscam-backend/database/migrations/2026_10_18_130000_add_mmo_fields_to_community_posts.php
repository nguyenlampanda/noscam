<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('community_posts', function (Blueprint $table) {
            $table->string('work_mode', 20)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('address', 250)->nullable();
            $table->string('salary', 100)->nullable();
            $table->string('salary_unit', 20)->nullable();
            $table->date('deadline')->nullable();
            $table->string('contact', 250)->nullable();

            $table->index(
                ['status', 'category', 'work_mode'],
                'community_mmo_filter_idx'
            );
            $table->index(
                ['status', 'city'],
                'community_mmo_city_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('community_posts', function (Blueprint $table) {
            $table->dropIndex('community_mmo_filter_idx');
            $table->dropIndex('community_mmo_city_idx');
            $table->dropColumn([
                'work_mode', 'city', 'address', 'salary',
                'salary_unit', 'deadline', 'contact',
            ]);
        });
    }
};
