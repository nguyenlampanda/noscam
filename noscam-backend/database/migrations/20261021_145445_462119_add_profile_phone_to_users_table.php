<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'phone')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('phone', 20)->nullable();
            });
        }
    }

    public function down(): void
    {
        // Không tự động xóa dữ liệu số điện thoại.
        // Nếu cần rollback, xử lý riêng sau khi backup DB.
    }
};
