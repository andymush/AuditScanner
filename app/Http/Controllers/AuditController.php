<?php

namespace App\Http\Controllers;

use App\Jobs\RunAuditJob;
use App\Models\AuditReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditController extends Controller
{
    public function submit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_type' => ['required', 'in:github_url,file_upload'],
            'repo_url'    => ['required_if:source_type,github_url', 'nullable', 'url'],
            'file'        => ['required_if:source_type,file_upload', 'nullable', 'file', 'mimes:zip', 'max:20480'],
        ]);

        $report = AuditReport::create([
            'user_id'     => $request->user()->id,
            'status'      => 'pending',
            'source_type' => $validated['source_type'],
            'repo_url'    => $validated['repo_url'] ?? null,
            'repo_name'   => $this->parseRepoName($validated['repo_url'] ?? null),
        ]);

        if ($validated['source_type'] === 'file_upload' && $request->hasFile('file')) {
            $request->file('file')->storeAs("audits/{$report->id}", 'upload.zip');
        }

        RunAuditJob::dispatch($report->id);

        return response()->json([
            'audit_id' => $report->id,
            'status'   => 'pending',
            'message'  => 'Audit queued.',
        ], 202);
    }

    public function show(string $id): JsonResponse
    {
        $report = AuditReport::with('findings')->findOrFail($id);

        $data = [
            'audit_id'     => $report->id,
            'status'       => $report->status,
            'source_type'  => $report->source_type,
            'repo_name'    => $report->repo_name,
            'repo_url'     => $report->repo_url,
            'started_at'   => $report->started_at?->toIso8601String(),
            'completed_at' => $report->completed_at?->toIso8601String(),
            'error'        => $report->error_message,
            'meta'         => $report->meta,
            'summary'      => $report->status === 'complete' ? $report->summary : null,
            'findings'     => $report->status === 'complete'
                ? $report->findings->map(fn ($f) => $f->toArray())->values()
                : [],
        ];

        return response()->json($data);
    }

    public function stream(string $id): StreamedResponse
    {
        $report = AuditReport::findOrFail($id);

        return response()->stream(function () use ($report): void {
            echo "data: ".json_encode(['type' => 'connected', 'audit_id' => $report->id])."\n\n";
            ob_flush();
            flush();

            $startedAt = time();
            $timeout = 300; // 5 minutes

            while (true) {
                if (time() - $startedAt > $timeout) {
                    break;
                }

                $report->refresh();

                echo "data: ".json_encode(['type' => 'status', 'status' => $report->status])."\n\n";
                ob_flush();
                flush();

                if ($report->status === 'complete') {
                    echo "data: ".json_encode(['type' => 'done', 'status' => 'complete'])."\n\n";
                    ob_flush();
                    flush();
                    break;
                }

                if ($report->status === 'failed') {
                    echo "data: ".json_encode(['type' => 'error', 'message' => $report->error_message])."\n\n";
                    ob_flush();
                    flush();
                    break;
                }

                sleep(2);
            }
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection'        => 'keep-alive',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $audits = AuditReport::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'status', 'source_type', 'repo_name', 'repo_url', 'created_at', 'completed_at']);

        return response()->json($audits);
    }

    private function parseRepoName(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }

        $parts = array_values(array_filter(explode('/', parse_url($url, PHP_URL_PATH) ?? '')));

        return isset($parts[1]) ? $parts[1] : null;
    }
}