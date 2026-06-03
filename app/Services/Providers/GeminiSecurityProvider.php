<?php

namespace App\Services\Providers;

use App\Contracts\AiSecurityProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiSecurityProvider implements AiSecurityProvider
{
    public function scanCodebase(array $files, string $auditId): array
    {
        $codebasePrompt = $this->buildCodebasePrompt($files);
        $url = $this->buildUrl();

        $response = Http::withHeaders(['Content-Type' => 'application/json'])
            ->timeout(120)
            ->post($url, [
                'systemInstruction' => [
                    'parts' => [['text' => $this->systemPrompt()]],
                ],
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $codebasePrompt]]],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                    'temperature'      => config('audithawk.gemini.temperature', 0.1),
                    'maxOutputTokens'  => config('audithawk.gemini.max_tokens', 8192),
                ],
                'safetySettings' => [
                    ['category' => 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
                    ['category' => 'HARM_CATEGORY_HARASSMENT',        'threshold' => 'BLOCK_ONLY_HIGH'],
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Gemini API error: '.$response->status().' '.$response->body());
        }

        $candidate = $response->json('candidates.0') ?? [];
        $finishReason = $candidate['finishReason'] ?? '';

        if ($finishReason === 'SAFETY') {
            Log::warning('AuditHawk: Gemini blocked response due to safety filters', ['auditId' => $auditId]);

            return [];
        }

        $text = $candidate['content']['parts'][0]['text'] ?? '';

        // Strip accidental markdown code fences
        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/\s*```$/m', '', $text);

        $decoded = json_decode(trim($text), true);
        if (! is_array($decoded)) {
            Log::warning('AuditHawk: Gemini returned non-JSON response', ['auditId' => $auditId]);

            return [];
        }

        // Support both a root array and a { findings: [...] } wrapper
        $raw = isset($decoded['findings']) ? $decoded['findings'] : $decoded;

        $findings = [];
        foreach ($raw as $item) {
            if (! is_array($item)) {
                continue;
            }
            $findings[] = $this->normalizeFinding($item);
        }

        return $findings;
    }

    public function getProviderName(): string
    {
        return 'gemini-'.config('audithawk.gemini.model');
    }

    private function buildUrl(): string
    {
        $base = rtrim(config('audithawk.gemini.base_url'), '/');
        $model = config('audithawk.gemini.model');
        $key = config('audithawk.gemini.key');

        return "{$base}/{$model}:generateContent?key={$key}";
    }

    private function buildCodebasePrompt(array $files): string
    {
        $parts = ["Audit the following codebase for security vulnerabilities. Return a JSON array of findings.\n\n"];

        foreach ($files as $file) {
            $parts[] = "=== FILE: {$file['path']} ===\n{$file['content']}\n\n";
        }

        return implode('', $parts);
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are a senior application security engineer. Audit the provided codebase and return ONLY a valid JSON array of vulnerability findings. Do not include any explanation or markdown — just the JSON array.

Each finding must have:
- type: string (e.g. sql_injection, xss, hardcoded_secret, broken_auth, insecure_dependency, path_traversal, ssrf, idor, rce, misconfigured_permissions)
- severity: "critical" | "high" | "medium" | "low"
- cvss_score: float 0.0–10.0
- file: string (file path)
- line: integer or null
- description: string
- fix_suggestion: string or null

Only flag real, exploitable vulnerabilities.
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
            'cve_references' => [],
            'reasoning'      => '',
            'source'         => 'gemini',
        ];
    }
}