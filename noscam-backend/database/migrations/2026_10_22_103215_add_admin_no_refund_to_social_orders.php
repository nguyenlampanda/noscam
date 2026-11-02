<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void {
  Schema::table('social_orders', function(Blueprint $table) {
   $table->boolean('admin_no_refund')->default(false);
  });
  Schema::create('social_order_admin_closures', function(Blueprint $table) {
   $table->id();
   $table->foreignId('social_order_id')->unique()->constrained('social_orders')->restrictOnDelete();
   $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
   $table->string('status_before',50);
   $table->string('status_after',50);
   $table->decimal('refunded_before',18,4)->default(0);
   $table->text('reason');
   $table->timestamps();
  });
 }
 public function down(): void {
  Schema::dropIfExists('social_order_admin_closures');
  Schema::table('social_orders', function(Blueprint $table) { $table->dropColumn('admin_no_refund'); });
 }
};
