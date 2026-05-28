<?php

namespace App\Services\Providers;

use App\Contracts\AiSecurityProvider;
use App\Events\AuditProgressUpdated;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ClaudeSecurityProvider implements AiSecurityProvider
{
    private const MAX_TURNS = 10;

    private array $tools = [
        [
            'name'        => 'flag_vulnerability',
            'description' => 'Flag a security vulnerability found in the codebase.',
            'input_schema' => [
                'type'       => 'object',
                'required'   => ['type', 'severity', 'description'],
                'properties' => [
                    'type'           => ['type' => 'string'],
                    'severity'       => ['type' => 'string', 'enum' => ['critical', 'high', 'medium', 'low']],
                    'cvss_score'     => ['type' => 'number'],
                    'file'           => ['type' => 'string'],
                    'line'           => ['type' => 'integer'],
                    'description'    => ['type' => 'string'],
                    'fix_suggestion' => ['type' => 'string'],
                    'cve_references' => ['type' => 'array', 'items' => ['type' => 'string']],
                    'reasoning'      => ['type' => 'string'],
                ],
            ],
        ],
        [
            'name'        => 'request_file_focus',
            'description' => 'Signal that a file requires cross-file analysis due to a detected pattern.',
            'input_schema' => [
                'type'       => 'object',
                'required'   => ['file', 'reason'],
                'properties' => [
                    'file'   => ['type' => 'string'],
                    'reason' => ['type' => 'string'],
                ],
            ],
        ],
    ];

    public function scanCodebase(array $files, string $auditId): array
    {
        $codebasePrompt = $this->buildCodebasePrompt($files);
        $messages = [
            ['role' => 'user', 'content' => $codebasePrompt],
        ];

        $findings = [];

        for ($turn = 0; $turn < self::MAX_TURNS; $turn++) {
            $response = $this->callApi($messages);
            $stopReason = $response['stop_reason'] ?? 'end_turn';
            $content = $response['content'] ?? [];

            $messages[] = ['role' => 'assistant', 'content' => $content];

            if ($stopReason !== 'tool_use') {
                break;
            }

            $toolResults = [];
            foreach ($content as $block) {
                if (($block['type'] ?? '') !== 'tool_use') {
                    continue;
                }

                $toolName = $block['name'];
                $input = $block['input'];

                if ($toolName === 'flag_vulnerability') {
                    $finding = $this->normalizeFinding($input);
                    $findings[] = $finding;

                    AuditProgressUpdated::dispatch($auditId, [
                        'type'    => 'finding',
                        'engine'  => 'claude',
                        'finding' => $finding,
                    ]);
                }

                if ($toolName === 'request_file_focus') {
                    AuditProgressUpdated::dispatch($auditId, [
                        'type'   => 'focus',
                        'engine' => 'claude',
                        'file'   => $input['file'] ?? '',
                        'reason' => $input['reason'] ?? '',
                    ]);
                }

                $toolResults[] = [
                    'type'        => 'tool_result',
                    'tool_use_id' => $block['id'],
                    'content'     => 'Acknowledged.',
                ];
            }

            $messages[] = ['role' => 'user', 'content' => $toolResults];
        }

        return $findings;
    }

    public function getProviderName(): string
    {
        return 'claude-'.config('audithawk.anthropic.model');
    }

    private function callApi(array $messages): array
    {
        $response = Http::withHeaders([
            'x-api-key'         => config('audithawk.anthropic.key'),
            'anthropic-version' => config('audithawk.anthropic.version'),
            'Content-Type'      => 'application/json',
        ])->timeout(120)->post(config('audithawk.anthropic.base_url').'/messages', [
            'model'      => config('audithawk.anthropic.model'),
            'max_tokens' => config('audithawk.anthropic.max_tokens'),
            'system'     => $this->systemPrompt(),
            'tools'      => $this->tools,
            'messages'   => $messages,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Claude API error: '.$response->status().' '.$response->body());
        }

        return $response->json();
    }

    private function buildCodebasePrompt(array $files): string
    {
        $parts = ["I need you to audit the following codebase for security vulnerabilities.\n\n"];

        foreach ($files as $file) {
            $parts[] = "=== FILE: {$file['path']} ===\n{$file['content']}\n\n";
        }

        $parts[] = 'Please survey the architecture, then flag every exploitable vulnerability using the flag_vulnerability tool. Use request_file_focus to signal cross-file patterns. When done, respond with end_turn.';

        return implode('', $parts);
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are a senior application security engineer. Your task is to perform a thorough security audit of the provided codebase.

Instructions:
1. Survey the overall architecture before flagging findings.
2. Use flag_vulnerability for each exploitable issue. Only flag real, actionable vulnerabilities — not theoretical risks.
3. Use request_file_focus when you detect a pattern that requires cross-file analysis.
4. Ground every fix_suggestion in the actual code you see.
5. Assign CVSS scores accurately based on exploitability and impact.
6. When finished, stop calling tools and send a brief summary.

Focus on: SQL injection, XSS, hardcoded secrets, broken authentication, insecure dependencies, path traversal, SSRF, IDOR, RCE, and misconfigured permissions.
PROMPT;
    }

    private function normalizeFinding(array $input): array
    {
        return [
            'type'           => $input['type'] ?? 'unknown',
            'severity'       => $input['severity'] ?? 'medium',
            'cvss_score'     => (float) ($input['cvss_score'] ?? 0.0),
            'file'           => $input['file'] ?? null,
            'line'           => isset($input['line']) ? (int) $input['line'] : null,
            'description'    => $input['description'] ?? '',
            'fix_suggestion' => $input['fix_suggestion'] ?? null,
            'cve_references' => $input['cve_references'] ?? [],
            'reasoning'      => $input['reasoning'] ?? '',
            'source'         => 'claude',
        ];
    }
}