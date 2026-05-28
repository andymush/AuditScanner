<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audit_findings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('audit_report_id');
            $table->foreign('audit_report_id')->references('id')->on('audit_reports')->cascadeOnDelete();
            $table->string('type');
            $table->string('severity');
            $table->float('cvss_score')->default(0.0);
            $table->string('file')->nullable();
            $table->integer('line')->nullable();
            $table->text('description');
            $table->text('fix_suggestion')->nullable();
            $table->json('fix_suggestions')->nullable();
            $table->json('cve_references')->nullable();
            $table->string('consensus');
            $table->float('confidence_score')->default(0.0);
            $table->json('confirmed_by')->nullable();
            $table->json('reasoning_trace')->nullable();
            $table->timestamps();

            $table->index('audit_report_id');
            $table->index('severity');
            $table->index('consensus');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_findings');
    }
};
