# AuditHawk

AI-powered security audit agent. Submit a GitHub repository URL or a zip file and receive a comprehensive vulnerability report cross-referenced by two independent AI engines — Claude and Gemini.

---

## Table of Contents

1. [Requirements](#requirements)
2. [Tech Stack](#tech-stack)
3. [Installation](#installation)
4. [Environment Setup](#environment-setup)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Queue Worker](#queue-worker)
8. [Testing AI Connections](#testing-ai-connections)
9. [Running Tests](#running-tests)
10. [Branch Strategy](#branch-strategy)
11. [How It Works](#how-it-works)

---

## Requirements

| Tool | Minimum Version |
|------|----------------|
| PHP | 8.4 |
| Composer | 2.x |
| Node.js | 20.x |
| npm | 10.x |
| SQLite | 3.x (default) or MySQL 8.x |

---

## Tech Stack

- **Backend** — Laravel 13, PHP 8.4
- **Frontend** — React 19, Inertia.js v3, Tailwind CSS v4
- **AI Engines** — Anthropic Claude (`claude-sonnet-4-20250514`), Google Gemini (`gemini-2.0-flash`)
- **Auth** — Laravel Fortify
- **Routing** — Laravel Wayfinder (typed TypeScript route functions)
- **Queue** — Laravel database queue driver

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/andymush/AuditScanner.git
cd AuditScanner

# 2. Install PHP dependencies
composer install

# 3. Install Node dependencies
npm install

# 4. Copy environment file
cp .env.example .env

# 5. Generate application key
php artisan key:generate
```

---

## Environment Setup

Open `.env` and configure the following:

### Application

```env
APP_NAME=AuditHawk
APP_ENV=local
APP_URL=http://localhost:8000
```

### AI API Keys (Required)

```env
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

> The application will throw a `RuntimeException` on boot if either key is missing (skipped during tests).

### Database

SQLite is the default — no extra setup needed:

```env
DB_CONNECTION=sqlite
```

To use MySQL instead:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=audithawk
DB_USERNAME=root
DB_PASSWORD=your_password
```

### Queue

```env
QUEUE_CONNECTION=database
```

---

## Database Setup

```bash
# Run migrations
php artisan migrate

# (Optional) Seed with sample data
php artisan db:seed
```

---

## Running the Application

### Option A — All-in-one (recommended for development)

```bash
composer run dev
```

This starts the Laravel server, Vite dev server, and queue worker concurrently.

### Option B — Manually

```bash
# Terminal 1 — Laravel dev server
php artisan serve

# Terminal 2 — Vite (React + Tailwind hot reload)
npm run dev

# Terminal 3 — Queue worker (required for audits to process)
php artisan queue:work --timeout=600
```

The application will be available at `http://localhost:8000`.

---

## Queue Worker

Audits are processed as background jobs. The queue worker **must** be running for audits to execute.

```bash
php artisan queue:work --timeout=600
```

| Setting | Value |
|---------|-------|
| Job timeout | 10 minutes |
| Retries | 1 (no automatic retry) |

---

## Testing AI Connections

Before running a full audit, verify your API keys work:

```bash
# Test Claude (Anthropic)
php artisan audithawk:test-claude

# Test Gemini (Google)
php artisan audithawk:test-gemini
```

Both commands send a vulnerable PHP snippet to each engine and dump the findings as JSON. A successful response confirms your keys are valid.

---

## Running Tests

```bash
# Run all tests
php artisan test --compact

# Run a specific test file
php artisan test --compact tests/Feature/AuditControllerTest.php

# Run a specific test method
php artisan test --compact --filter=testAuditSubmission
```

---

## Branch Strategy

| Branch | Role | Merge target |
|--------|------|-------------|
| `feature/*` | New features and fixes | `develop` |
| `develop` | Active integration branch | `test` |
| `test` | QA / staging | `master` |
| `master` | Production | — |

**Rules:**
- `master` and `test` are protected — direct pushes are blocked.
- All changes to `master` and `test` require a pull request with at least 1 approval.
- `master` enforces rules for admins too (`enforce_admins: true`).

### Typical workflow

```bash
# Start a feature
git checkout develop
git checkout -b feature/my-feature

# Finish and push
git push origin feature/my-feature

# Open PR: feature/my-feature → develop (GitHub)
# Open PR: develop → test         (GitHub)
# Open PR: test → master          (GitHub)
```

---

## How It Works

```
POST /api/audits
       ↓
RunAuditJob (queued, 10-min timeout)
       ↓
Stage 1 — RepoIngestionService
   GitHub URL → fetch files via GitHub API
   Zip upload → extract to storage/app/audits/{id}

Stage 2 — ClaudeSecurityProvider
   Agentic loop, up to 10 turns
   Tools: flag_vulnerability, request_file_focus
   Streams findings via SSE (AuditProgressUpdated event)

Stage 3 — GeminiSecurityProvider
   Single-pass scan
   Returns structured JSON (responseMimeType: application/json)

Stage 4 — FindingReconciliationService
   Both engines agree (line ±5) → consensus: confirmed, confidence: 0.95
   Claude only                  → consensus: claude_only,  confidence: 0.65
   Gemini only                  → consensus: gemini_only,  confidence: 0.65

Stage 5 — CveService
   Enriches insecure_dependency findings via OSV API (cached 24h)
```

### Audit API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/audits` | Submit a new audit |
| `GET` | `/api/audits` | List all audits |
| `GET` | `/api/audits/{id}` | Get audit report |
| `GET` | `/api/audits/{id}/stream` | SSE stream (live findings) |

### Finding severity levels

`critical` · `high` · `medium` · `low`

### Finding types

`sql_injection` · `xss` · `hardcoded_secret` · `broken_auth` · `insecure_dependency` · `path_traversal` · `ssrf` · `idor` · `rce` · `misconfigured_permissions`
