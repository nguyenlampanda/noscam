<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            // SQLite không áp dụng giới hạn VARCHAR(50)
            // như MySQL. Giữ nguyên cấu trúc bảng.
            return;
        }

        if ($driver === 'mysql') {
            DB::statement(
                'ALTER TABLE social_services MODIFY COLUMN platform VARCHAR(50) NOT NULL'
            );
            return;
        }

        throw new \RuntimeException(
            'Unsupported database driver: ' . $driver
        );
    }

    public function down(): void
    {
        // Không thu hẹp cột để tránh mất dữ liệu.
    }
};
