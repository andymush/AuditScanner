# AuditHawk — Backend CLAUDE.md
### Complete Integration Guide from Scratch
> AI-Powered Security Audit Agent | Laravel 11 + Claude (Anthropic) + Gemini (Google AI Studio)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Prerequisites](#3-prerequisites)
4. [Phase 1 — Project Setup](#4-phase-1--project-setup)
5. [Phase 2 — Configuration](#5-phase-2--configuration)
6. [Phase 3 — Database Migrations](#6-phase-3--database-migrations)
7. [Phase 4 — Models](#7-phase-4--models)
8. [Phase 5 — Contracts](#8-phase-5--contracts)
9. [Phase 6 — Services](#9-phase-6--services)
10. [Phase 7 — Events & Broadcasting](#10-phase-7--events--broadcasting)
11. [Phase 8 — Jobs](#11-phase-8--jobs)
12. [Phase 9 — Controllers](#12-phase-9--controllers)
13. [Phase 10 — Routes](#13-phase-10--routes)
14. [Phase 11 — Test Commands](#14-phase-11--test-commands)
15. [Phase 12 — Service Provider Bindings](#15-phase-12--service-provider-bindings)
16. [Phase 13 — Running Everything](#16-phase-13--running-everything)
17. [API Contract Reference](#17-api-contract-reference)
18. [Complete File Map](#18-complete-file-map)
19. [Known Constraints & Limits](#19-known-constraints--limits)

---

## 1. Project Overview

AuditHawk is a full-stack web application that autonomously audits codebases for security
vulnerabilities using a dual-AI pipeline:

- **Claude** (claude-sonnet-4-20250514) — primary deep-reasoning engine via Anthropic API.
  Runs an agentic tool-use loop across the full codebase, reasoning across multiple files
  simultaneously to detect cross-file vulnerabilities.

- **Gemini** (gemini-2.0-flash) — independent validation engine via Google AI Studio.
  Performs a fast single-pass scan, returning structured JSON findings directly.
  Authenticated with a plain API key — no OAuth, no service account required.

Findings from both engines are reconciled by a confidence-scoring layer. A vulnerability
confirmed by both AIs independently receives a confirmed status with 0.95 confidence.
Findings from only one engine are surfaced for review at 0.65 confidence.

### Why Google AI Studio (not Vertex AI)

| Vertex AI (Cloud Console)         | AI Studio                          |
|-----------------------------------|------------------------------------|
| Service Account JSON file         | Plain API key in .env              |
| OAuth2 Bearer token exchange      | ?key=YOUR_KEY in URL               |
| aiplatform.googleapis.com         | generativelanguage.googleapis.com  |
| composer require google/auth      | No extra library needed            |
| Token caching + refresh logic     | Nothing — stateless per request    |

---

## 2. Architecture Summary

```
POST /api/audits
        |
        v
 RunAuditJob (queued — async, up to 10 min)
        |
        |-- Stage 1: RepoIngestionService
        |   |-- GitHub URL  -> GitHub API -> file tree -> fetch auditable files
        |   `-- File upload -> unzip -> read directory -> filter by extension
        |
        |-- Stage 2: ClaudeSecurityProvider  (Primary Engine)
        |   |-- Agentic loop with tool use
        |   |   |-- flag_vulnerability  -> collects each finding
        |   |   `-- request_file_focus  -> signals cross-file patterns
        |   |-- Multi-turn conversation — up to 10 turns
        |   |-- Full codebase in context (long context window)
        |   `-- Broadcasts SSE progress events per finding
        |
        |-- Stage 3: GeminiSecurityProvider  (Validation Engine)
        |   |-- Single-pass scan — full codebase in one prompt
        |   |-- Google AI Studio: ?key=GEMINI_API_KEY in URL
        |   |-- responseMimeType: application/json -> structured output directly
        |   `-- Safety settings relaxed to BLOCK_ONLY_HIGH for security content
        |
        |-- Stage 4: FindingReconciliationService
        |   |-- Match by: same type + same file + line proximity (+-5 lines)
        |   |-- confirmed    -> both engines agree   -> confidence 0.95
        |   |-- claude_only  -> Claude only flagged  -> confidence 0.65
        |   `-- gemini_only  -> Gemini only flagged  -> confidence 0.65
        |
        `-- Stage 5: CveService
            |-- OSV API (free, no key) -> cross-reference insecure_dependency findings
            `-- Persist all findings to audit_findings table

GET /api/audits/{id}        -> Poll status + full report
GET /api/audits/{id}/stream -> SSE stream for live reasoning trace
GET /api/audits             -> List recent audits
```

---

## 3. Prerequisites

```bash
php --version        # PHP 8.2+ required
composer --version   # Composer 2+
mysql --version      # MySQL 8+
```

---

## 4. Phase 1 — Project Setup

### 1.1 Create Laravel Project

```bash
composer create-project laravel/laravel audithawk-backend
cd audithawk-backend
```

### 1.2 Install Dependencies

```bash
composer require guzzlehttp/guzzle
composer require laravel/telescope --dev
php artisan telescope:install
```

### 1.3 Environment File (.env)

```env
APP_NAME=AuditHawk
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=audithawk
DB_USERNAME=root
DB_PASSWORD=

QUEUE_CONNECTION=database

BROADCAST_CONNECTION=log
CACHE_STORE=file
SESSION_DRIVER=file

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/models

GITHUB_TOKEN=ghp_...
```

### 1.4 Generate Key & Create Database

```bash
php artisan key:generate
mysql -u root -p -e "CREATE DATABASE audithawk;"
```

---

## 5. Phase 2 — Configuration

### 2.1 Create config/audithawk.php

```php
<?php
return [
    'anthropic' => [
        'key'        => env('ANTHROPIC_API_KEY'),
        'model'      => env('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514'),
        'base_url'   => 'https://api.anthropic.com/v1',
        'version'    => '2023-06-01',
        'max_tokens' => 8096,
    ],
    'gemini' => [
        'key'         => env('GEMINI_API_KEY'),
        'model'       => env('GEMINI_MODEL', 'gemini-2.0-flash'),
        'base_url'    => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/models'),
        'max_tokens'  => 8192,
        'temperature' => 0.1,
    ],
    'github' => [
        'token'    => env('GITHUB_TOKEN'),
        'base_url' => 'https://api.github.com',
    ],
    'audit' => [
        'auditable_extensions' => [
            'php','js','ts','py','go','java','rb',
            'env','json','yaml','yml','xml','sql',
            'sh','bash','config','conf','ini',
        ],
        'skip_directories' => [
            'vendor','node_modules','.git','storage',
            'bootstrap/cache','public/build','dist',
        ],
        'max_file_size' => 100000,
        'max_files'     => 50,
    ],
];
```

### 2.2 Update config/cors.php

```php
'allowed_origins' => [
    'http://localhost:3000',
    'http://localhost:5173',
],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
```

---

## 6. Phase 3 — Database Migrations

### 3.1 Create Migrations

```bash
php artisan make:migration create_audit_reports_table
php artisan make:migration create_audit_findings_table
```

### audit_reports table

```php
Schema::create('audit_reports', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('status')->default('pending');
    $table->string('source_type');
    $table->string('repo_url')->nullable();
    $table->string('repo_name')->nullable();
    $table->json('meta')->nullable();
    $table->text('error_message')->nullable();
    $table->timestamp('started_at')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->timestamps();
});
```

### audit_findings table

```php
Schema::create('audit_findings', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('audit_report_id');
    $table->foreign('audit_report_id')->references('id')->on('audit_reports')->onDelete('cascade');
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
});
```

### 3.3 Run Migrations

```bash
php artisan queue:table
php artisan migrate
```

---

## 7. Phase 4 — Models

```bash
php artisan make:model AuditReport
php artisan make:model AuditFinding
```

**AuditReport** — HasUuids, has many AuditFinding, getSummaryAttribute() returning severity counts.

**AuditFinding** — HasUuids, belongs to AuditReport, casts: fix_suggestions, cve_references,
confirmed_by, reasoning_trace all as array; cvss_score and confidence_score as float.

See full model code in the service files — both models use the HasUuids trait and define
their $fillable, $casts, and relationship methods.

---

## 8. Phase 5 — Contracts

```bash
mkdir -p app/Contracts
touch app/Contracts/AiSecurityProvider.php
```

```php
<?php
namespace App\Contracts;

interface AiSecurityProvider
{
    public function scanCodebase(array $files, string $auditId): array;
    public function getProviderName(): string;
}
```

---

## 9. Phase 6 — Services

```bash
mkdir -p app/Services/Providers
```

### Files to create:

```
app/Services/RepoIngestionService.php
app/Services/Providers/ClaudeSecurityProvider.php
app/Services/Providers/GeminiSecurityProvider.php
app/Services/FindingReconciliationService.php
app/Services/CveService.php
app/Services/AuditPipelineService.php
```

---

### RepoIngestionService — Key responsibilities:

- fetchFromGithub(string $repoUrl): calls GitHub API tree endpoint recursively,
  filters by auditable extensions and file size, fetches each file's content,
  respects rate limits with 100ms delay between requests.
- fetchFromUpload(string $zipPath, string $auditId): extracts zip to
  storage/app/audits/{auditId}, reads directory recursively.
- cleanupTempFiles(string $auditId): removes temp directory after audit completes.
- isAuditableFile(): checks extension against auditable_extensions config.
- isSkippedDirectory(): checks against skip_directories config.

---

### ClaudeSecurityProvider — Key responsibilities:

Authentication: x-api-key header with ANTHROPIC_API_KEY, anthropic-version: 2023-06-01.

Tools defined:
  - flag_vulnerability: type, severity, cvss_score, file, line, description,
    fix_suggestion, cve_references, reasoning
  - request_file_focus: file, reason

Agentic loop (max 10 turns):
  1. Send initial prompt with full codebase
  2. If stop_reason = tool_use: execute tool, append result, continue loop
  3. If stop_reason = end_turn: break
  4. Each flag_vulnerability call: normalize finding, add to findings array,
     broadcast AuditProgressUpdated event for SSE stream

System prompt instructs Claude to act as a senior security engineer, survey
architecture first, flag only exploitable vulnerabilities via tool calls,
and ground fix suggestions in surrounding code.

---

### GeminiSecurityProvider — Key responsibilities:

Authentication: API key appended as URL query param:
  https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}

No headers needed beyond Content-Type: application/json.

Request body:
  - systemInstruction.parts[0].text: security audit system prompt
  - contents[0].role: user, parts[0].text: full codebase prompt
  - generationConfig.responseMimeType: application/json  (forces structured output)
  - generationConfig.temperature: 0.1
  - safetySettings: BLOCK_ONLY_HIGH for DANGEROUS_CONTENT and HARASSMENT

Response parsing:
  - Check finishReason != SAFETY before parsing
  - Extract candidates[0].content.parts[0].text
  - Strip accidental markdown fences with preg_replace
  - json_decode, validate each finding via normalizeFinding()
  - Tag each finding with source: gemini

---

### FindingReconciliationService — Key responsibilities:

reconcile(array $claudeFindings, array $geminiFindings): array
  - For each Claude finding: look for match in Gemini findings
  - Match criteria: same type + same file + line within +-5
  - Match found: buildConfirmedFinding() — consensus: confirmed, confidence: 0.95,
    confirmed_by: [claude, gemini], cvss = max of both, fix_suggestions.primary
    from Claude, fix_suggestions.alternative from Gemini
  - No match: buildSingleEngineFinding() — consensus: claude_only, confidence: 0.65
  - Remaining Gemini findings: buildSingleEngineFinding() — consensus: gemini_only
  - Sort: confirmed first, then by cvss_score descending

---

### CveService — Key responsibilities:

enrichFindings(array $findings): array
  - For each insecure_dependency finding: extract package name + version from description
  - Query OSV API: https://api.osv.dev/v1/query (free, no key)
  - Cache results for 24 hours with Cache::remember()
  - Merge returned CVE IDs into cve_references array

---

### AuditPipelineService — Key responsibilities:

run(array $files, string $auditId): array
  1. Broadcast stage 1 event
  2. claudeFindings = claude->scanCodebase()
  3. Broadcast stage 2 event
  4. geminiFindings = gemini->scanCodebase()
  5. Broadcast stage 3 event
  6. reconciled = reconciler->reconcile()
  7. enriched = cve->enrichFindings()
  8. Build meta array with all counts
  9. Return [findings => enriched, meta => meta]

---

## 10. Phase 7 — Events & Broadcasting

```bash
php artisan make:event AuditProgressUpdated
```

```php
class AuditProgressUpdated implements ShouldBroadcast
{
    public function __construct(
        public readonly string $auditId,
        public readonly array  $payload
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("audit.{$this->auditId}")];
    }

    public function broadcastAs(): string { return 'progress'; }
}
```

---

## 11. Phase 8 — Jobs

```bash
php artisan make:job RunAuditJob
```

Key properties:
- public int $timeout = 600  (10 min)
- public int $tries = 1       (no retries)

handle() flow:
  1. Find AuditReport, update status to running
  2. Ingest files (match source_type: github_url or file_upload)
  3. Throw if no auditable files found
  4. pipeline->run() to get findings + meta
  5. Persist each finding as AuditFinding model
  6. Update report: status=complete, meta, completed_at
  7. On error: update status=failed, error_message, broadcast error event
  8. Finally: cleanupTempFiles() always runs

---

## 12. Phase 9 — Controllers

```bash
php artisan make:controller AuditController
```

### submit() — POST /api/audits

Validates: source_type (required, in:github_url,file_upload),
repo_url (required_if github_url), file (required_if file_upload, mimes:zip, max:20480).

Creates AuditReport with pending status, dispatches RunAuditJob, returns 202 with audit_id.

### show() — GET /api/audits/{id}

Loads AuditReport with findings relationship, returns full JSON response.
Returns findings array only when status = complete.

### stream() — GET /api/audits/{id}/stream

Returns StreamedResponse with headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache
  X-Accel-Buffering: no
  Connection: keep-alive

Polls audit status every 2 seconds, broadcasts SSE data events, closes when
status is complete or failed, or after 5 minute timeout.

### index() — GET /api/audits

Returns 20 most recent audits ordered by created_at descending.

---

## 13. Phase 10 — Routes

```php
// routes/api.php
Route::prefix('audits')->group(function () {
    Route::post('/',           [AuditController::class, 'submit']);
    Route::get('/',            [AuditController::class, 'index']);
    Route::get('/{id}',        [AuditController::class, 'show']);
    Route::get('/{id}/stream', [AuditController::class, 'stream']);
});
```

---

## 14. Phase 11 — Test Commands

```bash
php artisan make:command TestGeminiConnection   # artisan audithawk:test-gemini
php artisan make:command TestClaudeConnection   # artisan audithawk:test-claude
```

Both commands send a trivially vulnerable PHP snippet (raw SQL query + hardcoded key)
to their respective AI provider and dump the JSON findings to the console.
Run these before wiring up the full pipeline to confirm API keys work.

```bash
php artisan audithawk:test-claude
php artisan audithawk:test-gemini
```

---

## 15. Phase 12 — Service Provider Bindings

In AppServiceProvider::register(), bind all services as singletons:

```php
$this->app->singleton(ClaudeSecurityProvider::class);
$this->app->singleton(GeminiSecurityProvider::class);
$this->app->singleton(FindingReconciliationService::class);
$this->app->singleton(CveService::class);
$this->app->singleton(AuditPipelineService::class);
$this->app->singleton(RepoIngestionService::class);
```

In boot(), fail fast if API keys are missing (skipped during unit tests):

```php
if (!app()->runningUnitTests()) {
    if (empty(config('audithawk.anthropic.key')))
        throw new \RuntimeException('ANTHROPIC_API_KEY is missing from .env');
    if (empty(config('audithawk.gemini.key')))
        throw new \RuntimeException('GEMINI_API_KEY is missing from .env');
}
```

---

## 16. Phase 13 — Running Everything

```bash
# 1. Run migrations
php artisan migrate

# 2. Test AI connections
php artisan audithawk:test-claude
php artisan audithawk:test-gemini

# 3. Start queue worker (dedicated terminal — keep running)
php artisan queue:work --timeout=600 --tries=1

# 4. Start API server (dedicated terminal — keep running)
php artisan serve

# 5. Test with a real vulnerable repo
curl -X POST http://localhost:8000/api/audits \
  -H "Content-Type: application/json" \
  -d '{"source_type":"github_url","repo_url":"https://github.com/webpwnized/mutillidae"}'

# 6. Poll results (replace with actual audit_id from step 5)
curl http://localhost:8000/api/audits/{audit_id}
```

---

## 17. API Contract Reference

| Method | Endpoint                  | Description               |
|--------|---------------------------|---------------------------|
| POST   | /api/audits               | Submit new audit          |
| GET    | /api/audits               | List 20 recent audits     |
| GET    | /api/audits/{id}          | Poll status + full report |
| GET    | /api/audits/{id}/stream   | SSE live progress stream  |

### POST /api/audits — GitHub URL

```json
{ "source_type": "github_url", "repo_url": "https://github.com/owner/repo" }
```

### Response 202

```json
{ "audit_id": "uuid", "status": "pending", "message": "Audit queued." }
```

### GET /api/audits/{id} — Complete Response Shape

```json
{
  "audit_id": "uuid",
  "status": "complete",
  "repo_name": "repo",
  "repo_url": "https://github.com/owner/repo",
  "started_at": "2025-01-01T10:00:00Z",
  "completed_at": "2025-01-01T10:02:30Z",
  "meta": {
    "engines_used": ["claude-sonnet-4", "gemini-2.0-flash"],
    "files_scanned": 38,
    "claude_count": 14, "gemini_count": 11,
    "confirmed_count": 9, "claude_only": 5, "gemini_only": 2,
    "total_findings": 16,
    "severity_counts": { "critical": 2, "high": 4, "medium": 7, "low": 3 }
  },
  "summary": { "total": 16, "critical": 2, "high": 4, "medium": 7, "low": 3, "confirmed": 9 },
  "findings": [
    {
      "id": "uuid",
      "type": "sql_injection",
      "severity": "critical",
      "cvss_score": 9.1,
      "file": "app/Controllers/UserController.php",
      "line": 42,
      "description": "...",
      "consensus": "confirmed",
      "confidence_score": 0.95,
      "confirmed_by": ["claude", "gemini"],
      "fix_suggestions": { "primary": "...", "alternative": "..." },
      "cve_references": [],
      "reasoning_trace": ["Step 1: ...", "Step 2: ..."]
    }
  ]
}
```

### SSE Event Types

```
{ "type": "connected", "audit_id": "uuid" }
{ "type": "stage",   "message": "Claude is performing deep analysis...", "stage": 1 }
{ "type": "finding", "engine": "claude", "finding": { ... } }
{ "type": "focus",   "engine": "claude", "file": "path.php", "reason": "..." }
{ "type": "status",  "status": "running" }
{ "type": "done",    "status": "complete" }
{ "type": "error",   "message": "Audit failed: ..." }
```

### Consensus Values

| consensus     | Meaning                           | Confidence |
|---------------|-----------------------------------|------------|
| confirmed     | Both engines independently agree  | 0.95       |
| claude_only   | Claude flagged — review needed    | 0.65       |
| gemini_only   | Gemini flagged — review needed    | 0.65       |

---

## 18. Complete File Map

```
audithawk-backend/
├── app/
│   ├── Console/Commands/
│   │   ├── TestClaudeConnection.php
│   │   └── TestGeminiConnection.php
│   ├── Contracts/
│   │   └── AiSecurityProvider.php
│   ├── Events/
│   │   └── AuditProgressUpdated.php
│   ├── Http/Controllers/
│   │   └── AuditController.php
│   ├── Jobs/
│   │   └── RunAuditJob.php
│   ├── Models/
│   │   ├── AuditFinding.php
│   │   └── AuditReport.php
│   ├── Providers/
│   │   └── AppServiceProvider.php
│   └── Services/
│       ├── Providers/
│       │   ├── ClaudeSecurityProvider.php
│       │   └── GeminiSecurityProvider.php
│       ├── AuditPipelineService.php
│       ├── CveService.php
│       ├── FindingReconciliationService.php
│       └── RepoIngestionService.php
├── config/
│   ├── audithawk.php
│   └── cors.php
├── database/migrations/
│   ├── xxxx_create_audit_reports_table.php
│   ├── xxxx_create_audit_findings_table.php
│   └── xxxx_create_jobs_table.php
├── routes/
│   └── api.php
└── .env
```

---

## 19. Known Constraints & Limits

| Constraint             | Value        | Where to change                    |
|------------------------|--------------|------------------------------------|
| Max files per audit    | 50           | audithawk.audit.max_files          |
| Max file size          | 100KB        | audithawk.audit.max_file_size      |
| Audit job timeout      | 10 minutes   | RunAuditJob::$timeout              |
| Claude agentic turns   | 10 max       | ClaudeSecurityProvider             |
| Queue retries          | 1 (no retry) | RunAuditJob::$tries                |
| SSE stream timeout     | 5 minutes    | AuditController::stream()          |
| GitHub unauth limit    | 60 req/hr    | Set GITHUB_TOKEN to raise          |
| GitHub auth limit      | 5000 req/hr  | GITHUB_TOKEN in .env               |
| Gemini safety filter   | BLOCK_ONLY_HIGH | GeminiSecurityProvider          |
| CVE cache duration     | 24 hours     | CveService                         |

### Recommended Test Repositories

```
https://github.com/webpwnized/mutillidae   # PHP — SQLi, XSS, auth issues
https://github.com/OWASP/WebGoat           # Java — OWASP Top 10 coverage
https://github.com/digininja/DVWA          # PHP — Damn Vulnerable Web App
```

---

*AuditHawk Backend | Laravel 11 | Claude (Anthropic) + Gemini (Google AI Studio)*
