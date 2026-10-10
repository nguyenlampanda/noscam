<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {

        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("
            ALTER TABLE mediator_identifiers
            MODIFY type ENUM(
                'phone',
                'bank_account',
                'facebook',
                'tiktok',
                'instagram',
                'zalo',
                'telegram',
                'other'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE mediator_identifiers
            MODIFY type ENUM(
                'phone',
                'bank_account',
                'facebook',
                'zalo',
                'telegram',
                'other'
            ) NOT NULL
        ");
    }
};
