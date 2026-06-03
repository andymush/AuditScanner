<?php

namespace App\Services;

use App\Models\AuditReport;

class DemoAuditPipeline
{
    public function run(AuditReport $report): array
    {
        $this->advanceStage($report, 2, 'Repository indexed. Claude performing deep agentic analysis...');
        sleep(3);

        $this->advanceStage($report, 3, 'Gemini performing independent single-pass validation...');
        sleep(3);

        $this->advanceStage($report, 4, 'Cross-referencing findings between engines...');
        sleep(2);

        $this->advanceStage($report, 5, 'Enriching confirmed findings with CVE data...');
        sleep(1);

        $findings = $this->findings();

        $meta = [
            'engines_used' => ['claude-claude-sonnet-4-20250514', 'gemini-gemini-2.0-flash'],
            'files_scanned' => 34,
            'claude_count' => 6,
            'gemini_count' => 7,
            'confirmed_count' => count(array_filter($findings, fn ($f) => $f['consensus'] === 'confirmed')),
            'claude_only' => count(array_filter($findings, fn ($f) => $f['consensus'] === 'claude_only')),
            'gemini_only' => count(array_filter($findings, fn ($f) => $f['consensus'] === 'gemini_only')),
            'total_findings' => count($findings),
            'current_stage' => 5,
            'severity_counts' => [
                'critical' => count(array_filter($findings, fn ($f) => $f['severity'] === 'critical')),
                'high' => count(array_filter($findings, fn ($f) => $f['severity'] === 'high')),
                'medium' => count(array_filter($findings, fn ($f) => $f['severity'] === 'medium')),
                'low' => count(array_filter($findings, fn ($f) => $f['severity'] === 'low')),
            ],
        ];

        return ['findings' => $findings, 'meta' => $meta];
    }

    private function advanceStage(AuditReport $report, int $stage, string $message): void
    {
        $meta = $report->meta ?? [];
        $meta['current_stage'] = $stage;
        $meta['stage_message'] = $message;
        $report->update(['meta' => $meta]);
    }

    private function findings(): array
    {
        return [
            [
                'type' => 'sql_injection',
                'severity' => 'critical',
                'cvss_score' => 9.8,
                'file' => 'app/Http/Controllers/OrderController.php',
                'line' => 47,
                'description' => 'Raw user input is interpolated directly into a SQL query string. An attacker can inject arbitrary SQL to dump the entire database, bypass authentication, or drop tables.',
                'fix_suggestion' => 'Replace raw DB::select() with a parameterised Eloquent query: Order::where("user_id", $request->validated("user_id"))->get()',
                'fix_suggestions' => [
                    'primary' => 'Replace raw DB::select() with a parameterised Eloquent query: Order::where("user_id", $request->validated("user_id"))->get()',
                    'alternative' => 'Use PDO prepared statements with named bindings: DB::select("SELECT * FROM orders WHERE user_id = :id", ["id" => $userId])',
                ],
                'cve_references' => ['CVE-2023-28435'],
                'consensus' => 'confirmed',
                'confidence_score' => 0.95,
                'confirmed_by' => ['claude', 'gemini'],
                'reasoning_trace' => [
                    'Scanned OrderController — found DB::select() call on line 47.',
                    'Traced $request->input("user_id") — no validation or sanitisation upstream.',
                    'String interpolation confirmed: "SELECT * FROM orders WHERE user_id = $userId".',
                    'Flagged as critical SQL injection. Requested file focus on UserController to check for related pattern.',
                    'Gemini independently confirmed the same interpolation on the same line.',
                ],
            ],
            [
                'type' => 'hardcoded_secret',
                'severity' => 'critical',
                'cvss_score' => 9.1,
                'file' => 'config/payment.php',
                'line' => 12,
                'description' => 'A live Stripe secret key is hardcoded in the config file and will be committed to version control. Anyone with repository read access can make charges against the account.',
                'fix_suggestion' => 'Move the key to .env: STRIPE_SECRET=sk_live_... and reference it as env("STRIPE_SECRET"). Add config/payment.php to .gitignore if it is not already excluded.',
                'fix_suggestions' => [
                    'primary' => 'Move the key to .env: STRIPE_SECRET=sk_live_... and reference it as env("STRIPE_SECRET").',
                    'alternative' => 'Use a secrets manager (AWS Secrets Manager or HashiCorp Vault) and inject at runtime.',
                ],
                'cve_references' => [],
                'consensus' => 'confirmed',
                'confidence_score' => 0.95,
                'confirmed_by' => ['claude', 'gemini'],
                'reasoning_trace' => [
                    'Detected string matching pattern sk_live_[a-zA-Z0-9]+ in config/payment.php line 12.',
                    'Confirmed this is a Stripe live secret key — not a test key (does not start with sk_test_).',
                    'Cross-referenced .gitignore — config/payment.php is not excluded.',
                    'This key is exposed to anyone with repo access. Severity: critical.',
                ],
            ],
            [
                'type' => 'broken_auth',
                'severity' => 'high',
                'cvss_score' => 8.1,
                'file' => 'app/Http/Middleware/JwtMiddleware.php',
                'line' => 33,
                'description' => 'JWT token signature is verified but the `exp` (expiration) claim is never checked. Stolen tokens remain valid indefinitely, enabling session hijacking long after a user logs out.',
                'fix_suggestion' => 'Add expiry validation after signature check: if ($payload->exp < time()) { throw new TokenExpiredException(); }',
                'fix_suggestions' => [
                    'primary' => 'Add expiry validation: if ($payload->exp < time()) { throw new TokenExpiredException(); }',
                    'alternative' => 'Switch to Laravel Sanctum which handles token lifecycle, expiry, and revocation out of the box.',
                ],
                'cve_references' => ['CVE-2022-21449'],
                'consensus' => 'confirmed',
                'confidence_score' => 0.95,
                'confirmed_by' => ['claude', 'gemini'],
                'reasoning_trace' => [
                    'Reviewed JwtMiddleware — signature verification present via jwt_decode().',
                    'No check on $payload->exp or $payload->iat found in the middleware chain.',
                    'Tokens issued with an exp claim are accepted past their expiry date.',
                    'An attacker with a captured token can use it forever. Rated high severity.',
                ],
            ],
            [
                'type' => 'rce',
                'severity' => 'high',
                'cvss_score' => 8.8,
                'file' => 'app/Services/ReportService.php',
                'line' => 91,
                'description' => 'User-supplied report format string is passed directly to eval(). An authenticated user can execute arbitrary PHP code on the server.',
                'fix_suggestion' => 'Remove eval() entirely. Use an allowlist of supported formats (pdf, csv, xlsx) and dispatch to format-specific handlers.',
                'fix_suggestions' => [
                    'primary' => 'Remove eval() entirely. Use an allowlist: match($format) { "pdf" => ..., "csv" => ... }',
                    'alternative' => 'If dynamic code execution is truly required, run it in a sandboxed subprocess with no filesystem access.',
                ],
                'cve_references' => [],
                'consensus' => 'claude_only',
                'confidence_score' => 0.65,
                'confirmed_by' => ['claude'],
                'reasoning_trace' => [
                    'Detected eval() call in ReportService::generateExport() on line 91.',
                    'Traced argument: eval("return new {$request->format}Exporter();")',
                    '$request->format is user-controlled with no allowlist validation.',
                    'Gemini did not flag this file — may have been below its token context window.',
                    'Confidence adjusted to 0.65 (single-engine finding).',
                ],
            ],
            [
                'type' => 'xss',
                'severity' => 'medium',
                'cvss_score' => 6.1,
                'file' => 'resources/views/products/show.blade.php',
                'line' => 28,
                'description' => 'Product description is rendered with {!! !!} (unescaped output) instead of {{ }}. A seller who can set their own product description can inject scripts that execute in buyer browsers.',
                'fix_suggestion' => 'Change {!! $product->description !!} to {{ $product->description }} to use Blade\'s automatic HTML escaping.',
                'fix_suggestions' => [
                    'primary' => 'Change {!! $product->description !!} to {{ $product->description }}.',
                    'alternative' => 'If HTML is intentional, sanitise with HTMLPurifier before storing: Purifier::clean($input)',
                ],
                'cve_references' => [],
                'consensus' => 'gemini_only',
                'confidence_score' => 0.65,
                'confirmed_by' => ['gemini'],
                'reasoning_trace' => [],
            ],
            [
                'type' => 'path_traversal',
                'severity' => 'medium',
                'cvss_score' => 6.5,
                'file' => 'app/Http/Controllers/FileController.php',
                'line' => 19,
                'description' => 'The filename parameter from the request is used directly to construct a storage path without sanitisation. An attacker can submit ../../.env to read arbitrary files outside the intended directory.',
                'fix_suggestion' => 'Use basename() to strip directory traversal: $path = storage_path("uploads/".basename($request->filename)). Also validate the resolved path stays inside the uploads directory.',
                'fix_suggestions' => [
                    'primary' => 'Use basename($request->filename) and verify realpath() stays within the uploads root.',
                    'alternative' => 'Store files under a UUID key and never use user-provided names for the filesystem path.',
                ],
                'cve_references' => [],
                'consensus' => 'gemini_only',
                'confidence_score' => 0.65,
                'confirmed_by' => ['gemini'],
                'reasoning_trace' => [],
            ],
            [
                'type' => 'misconfigured_permissions',
                'severity' => 'low',
                'cvss_score' => 3.1,
                'file' => '.env.example',
                'line' => null,
                'description' => '.env.example contains real-looking default credentials (DB_PASSWORD=admin123) that developers may copy verbatim into production without changing.',
                'fix_suggestion' => 'Replace all values in .env.example with clearly fake placeholders: DB_PASSWORD=CHANGE_ME_IN_PRODUCTION',
                'fix_suggestions' => [
                    'primary' => 'Use clearly fake placeholders: DB_PASSWORD=CHANGE_ME_IN_PRODUCTION',
                    'alternative' => null,
                ],
                'cve_references' => [],
                'consensus' => 'claude_only',
                'confidence_score' => 0.65,
                'confirmed_by' => ['claude'],
                'reasoning_trace' => [
                    'Reviewed .env.example — found DB_PASSWORD=admin123 and REDIS_PASSWORD=redis123.',
                    'These are plausible defaults that developers frequently copy into production.',
                    'Not an immediate vulnerability, but a common path to credential exposure.',
                ],
            ],
        ];
    }
}
