<?php

namespace App\Services;

use App\Events\AuditProgressUpdated;
use App\Services\Providers\ClaudeSecurityProvider;
use App\Services\Providers\GeminiSecurityProvider;

class AuditPipelineService
{
    public function __construct(
        private readonly ClaudeSecurityProvider $claude,
        private readonly GeminiSecurityProvider $gemini,
        private readonly FindingReconciliationService $reconciler,
        private readonly CveService $cve,
    ) {}

    public function run(array $files, string $auditId): array
    {
        AuditProgressUpdated::dispatch($auditId, [
            'type'    => 'stage',
            'stage'   => 1,
            'message' => 'Ingestion complete. Claude is performing deep analysis...',
        ]);

        $claudeFindings = $this->claude->scanCodebase($files, $auditId);

        AuditProgressUpdated::dispatch($auditId, [
            'type'    => 'stage',
            'stage'   => 3,
            'message' => 'Gemini is performing independent validation...',
        ]);

        $geminiFindings = $this->gemini->scanCodebase($files, $auditId);

        AuditProgressUpdated::dispatch($auditId, [
            'type'    => 'stage',
            'stage'   => 4,
            'message' => 'Cross-referencing findings...',
        ]);

        $reconciled = $this->reconciler->reconcile($claudeFindings, $geminiFindings);

        AuditProgressUpdated::dispatch($auditId, [
            'type'    => 'stage',
            'stage'   => 5,
            'message' => 'Enriching with CVE data...',
        ]);

        $enriched = $this->cve->enrichFindings($reconciled);

        $meta = [
            'engines_used'    => [$this->claude->getProviderName(), $this->gemini->getProviderName()],
            'files_scanned'   => count($files),
            'claude_count'    => count($claudeFindings),
            'gemini_count'    => count($geminiFindings),
            'confirmed_count' => count(array_filter($enriched, fn ($f) => $f['consensus'] === 'confirmed')),
            'claude_only'     => count(array_filter($enriched, fn ($f) => $f['consensus'] === 'claude_only')),
            'gemini_only'     => count(array_filter($enriched, fn ($f) => $f['consensus'] === 'gemini_only')),
            'total_findings'  => count($enriched),
            'severity_counts' => [
                'critical' => count(array_filter($enriched, fn ($f) => $f['severity'] === 'critical')),
                'high'     => count(array_filter($enriched, fn ($f) => $f['severity'] === 'high')),
                'medium'   => count(array_filter($enriched, fn ($f) => $f['severity'] === 'medium')),
                'low'      => count(array_filter($enriched, fn ($f) => $f['severity'] === 'low')),
            ],
        ];

        return ['findings' => $enriched, 'meta' => $meta];
    }
}