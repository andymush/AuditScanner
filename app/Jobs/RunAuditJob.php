<?php

namespace App\Jobs;

use App\Events\AuditProgressUpdated;
use App\Models\AuditFinding;
use App\Models\AuditReport;
use App\Services\AuditPipelineService;
use App\Services\RepoIngestionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class RunAuditJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(
        public readonly string $auditReportId,
    ) {}

    public function handle(AuditPipelineService $pipeline, RepoIngestionService $ingestion): void
    {
        $report = AuditReport::findOrFail($this->auditReportId);
        $report->update(['status' => 'running', 'started_at' => now()]);

        AuditProgressUpdated::dispatch($report->id, [
            'type'    => 'stage',
            'stage'   => 1,
            'message' => 'Ingesting repository files...',
        ]);

        try {
            $files = match ($report->source_type) {
                'github_url'  => $ingestion->fetchFromGithub($report->repo_url),
                'file_upload' => $ingestion->fetchFromUpload(
                    storage_path("app/audits/{$report->id}/upload.zip"),
                    $report->id
                ),
                default => throw new RuntimeException("Unknown source_type: {$report->source_type}"),
            };

            if (empty($files)) {
                throw new RuntimeException('No auditable files found in the repository.');
            }

            $result = $pipeline->run($files, $report->id);

            foreach ($result['findings'] as $finding) {
                AuditFinding::create([
                    'audit_report_id' => $report->id,
                    ...$finding,
                ]);
            }

            $report->update([
                'status'       => 'complete',
                'meta'         => $result['meta'],
                'completed_at' => now(),
            ]);

            AuditProgressUpdated::dispatch($report->id, [
                'type'   => 'done',
                'status' => 'complete',
            ]);

        } catch (\Throwable $e) {
            Log::error('AuditHawk: RunAuditJob failed', [
                'audit_id' => $report->id,
                'error'    => $e->getMessage(),
            ]);

            $report->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            AuditProgressUpdated::dispatch($report->id, [
                'type'    => 'error',
                'message' => 'Audit failed: '.$e->getMessage(),
            ]);

        } finally {
            $ingestion->cleanupTempFiles($report->id);
        }
    }
}