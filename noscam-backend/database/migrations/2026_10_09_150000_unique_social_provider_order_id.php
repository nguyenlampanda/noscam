<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $duplicates = DB::table('social_orders')
            ->select('social_provider_id', 'provider_order_id')
            ->whereNotNull('provider_order_id')
            ->groupBy('social_provider_id', 'provider_order_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($duplicates) {
            throw new RuntimeException(
                'Có mã đơn Provider bị trùng. Cần kiểm tra trước khi tạo unique index.'
            );
        }

        Schema::table('social_orders', function ($table) {
            $table->unique(
                ['social_provider_id', 'provider_order_id'],
                'social_orders_provider_order_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('social_orders', function ($table) {
            $table->dropUnique('social_orders_provider_order_unique');
        });
    }
};
