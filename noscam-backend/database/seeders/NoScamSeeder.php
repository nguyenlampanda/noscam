<?php

namespace Database\Seeders;

use App\Models\Entity;
use App\Models\EntityRelation;
use Illuminate\Database\Seeder;

class NoScamSeeder extends Seeder
{
    public function run(): void
    {
        $phone = Entity::updateOrCreate(
            [
                'type' => 'phone',
                'normalized_value' => '0909123456',
            ],
            [
                'value' => '0909123456',
                'report_count' => 7,
                'risk_score' => 82,
                'risk_level' => 'high',
                'first_detected_at' => now()->subDays(30),
                'last_report_at' => now()->subHours(3),
                'is_active' => true,
            ]
        );

        $bankAccount = Entity::updateOrCreate(
            [
                'type' => 'bank_account',
                'normalized_value' => '123456789',
            ],
            [
                'value' => '123456789',
                'report_count' => 4,
                'risk_score' => 68,
                'risk_level' => 'medium',
                'first_detected_at' => now()->subDays(20),
                'last_report_at' => now()->subDay(),
                'is_active' => true,
            ]
        );

        $website = Entity::updateOrCreate(
            [
                'type' => 'website',
                'normalized_value' => 'shop-example.vn',
            ],
            [
                'value' => 'shop-example.vn',
                'report_count' => 3,
                'risk_score' => 61,
                'risk_level' => 'medium',
                'first_detected_at' => now()->subDays(15),
                'last_report_at' => now()->subDays(2),
                'is_active' => true,
            ]
        );

        EntityRelation::updateOrCreate([
            'entity_id' => $phone->id,
            'related_entity_id' => $bankAccount->id,
            'relation_type' => 'related',
        ]);

        EntityRelation::updateOrCreate([
            'entity_id' => $phone->id,
            'related_entity_id' => $website->id,
            'relation_type' => 'related',
        ]);
    }
}