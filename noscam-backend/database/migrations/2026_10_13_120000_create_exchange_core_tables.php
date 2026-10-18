<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('exchange_social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('platform', 30);
            $table->string('username', 191);
            $table->string('normalized_username', 191);
            $table->string('profile_url', 2048);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['platform', 'normalized_username']);
            $table->index(['user_id', 'platform']);
        });

        Schema::create('exchange_task_prices', function (Blueprint $table) {
            $table->id();
            $table->string('platform', 30);
            $table->string('task_type', 30);
            $table->decimal('cost_per_task', 18, 4);
            $table->decimal('reward_per_task', 18, 4);
            $table->boolean('is_enabled')->default(false);
            $table->foreignId('updated_by')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['platform', 'task_type']);
        });

        Schema::create('exchange_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('social_account_id')->nullable()
                ->constrained('exchange_social_accounts')->nullOnDelete();
            $table->string('platform', 30);
            $table->string('task_type', 30);
            $table->string('target_url', 2048);
            $table->unsignedInteger('quantity');
            $table->decimal('cost_per_task', 18, 4);
            $table->decimal('reward_per_task', 18, 4);
            $table->decimal('budget_total', 18, 4);
            $table->decimal('budget_held', 18, 4);
            $table->decimal('budget_settled', 18, 4)->default(0);
            $table->decimal('budget_refunded', 18, 4)->default(0);
            $table->string('status', 30)->default('draft');
            $table->boolean('rules_accepted')->default(false);
            $table->timestamp('rules_accepted_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        Schema::create('exchange_task_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')
                ->constrained('exchange_campaigns')->restrictOnDelete();
            $table->foreignId('worker_user_id')
                ->constrained('users')->restrictOnDelete();
            $table->foreignId('social_account_id')
                ->constrained('exchange_social_accounts')->restrictOnDelete();
            $table->string('submitted_username', 191)->nullable();
            $table->string('submitted_profile_url', 2048)->nullable();
            $table->string('status', 30)->default('claimed');
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('review_deadline_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('appeal_deadline_at')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->boolean('risk_hold')->default(false);
            $table->timestamps();

            $table->unique(['campaign_id', 'social_account_id']);
            $table->index(['status', 'review_deadline_at']);
            $table->index(['status', 'appeal_deadline_at']);
        });

        Schema::create('exchange_task_disputes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')->unique()
                ->constrained('exchange_task_claims')->restrictOnDelete();
            $table->foreignId('opened_by')
                ->constrained('users')->restrictOnDelete();
            $table->string('status', 30)->default('pending');
            $table->text('appeal_reason');
            $table->json('evidence')->nullable();
            $table->text('admin_reason')->nullable();
            $table->foreignId('resolved_by')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('exchange_escrow_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')
                ->constrained('exchange_campaigns')->restrictOnDelete();
            $table->foreignId('claim_id')->nullable()
                ->constrained('exchange_task_claims')->restrictOnDelete();
            $table->string('entry_type', 30);
            $table->decimal('amount', 18, 4);
            $table->string('idempotency_key', 191)->unique();
            $table->foreignId('wallet_transaction_id')->nullable()
                ->constrained('wallet_transactions')->restrictOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'entry_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_escrow_entries');
        Schema::dropIfExists('exchange_task_disputes');
        Schema::dropIfExists('exchange_task_claims');
        Schema::dropIfExists('exchange_campaigns');
        Schema::dropIfExists('exchange_task_prices');
        Schema::dropIfExists('exchange_social_accounts');
    }
};
