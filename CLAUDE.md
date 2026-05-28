# AuditHawk — Project Context
> AI-Powered Security Audit Agent | Laravel 13 + Inertia v3 + React 19 + Tailwind v4

## What This App Does

AuditHawk is a full-stack web application where authenticated users submit a GitHub URL or a zip file and receive a comprehensive security vulnerability report. Two AI engines run independently and cross-reference their findings:

- **Claude** (`claude-sonnet-4-20250514`) — primary engine via Anthropic API. Runs an agentic tool-use loop across the full codebase, using `flag_vulnerability` and `request_file_focus` tool calls. Up to 10 turns.
- **Gemini** (`gemini-2.0-flash`) — validation engine via Google AI Studio (plain API key in URL — no OAuth, no service account). Single-pass scan returning structured JSON via `responseMimeType: application/json`.

A `FindingReconciliationService` reconciles both engines' findings. Findings confirmed by both engines get `consensus: confirmed` and `confidence_score: 0.95`. Single-engine findings get `0.65`.

## Stack Reality — Monorepo, Not Two Repos

The integration guide in `STRUCTURE/` describes two separate repos (standalone Laravel API + standalone Vite/React frontend). **This project is a monorepo**: Laravel + Inertia v3 + React 19. There is no separate frontend repo.

Key implications:
- Frontend pages live in `resources/js/pages/` as `.tsx` files, not `src/screens/`
- Components live in `resources/js/components/` — use `.tsx`
- Use Wayfinder (`@/actions/` / `@/routes/`) for typed route calls — never hardcode URLs
- Navigation uses Inertia's `<Link>` and `router`, not React Router
- The audit API routes (`/api/audits/*`) still exist for SSE streaming and file submission — these are not Inertia routes
- Authentication is handled by Fortify (already wired up) — all audit routes require auth

## Backend Architecture

```
POST /api/audits
        ↓
RunAuditJob (queued, timeout=600s, tries=1)
        ↓
Stage 1: RepoIngestionService
    ├── GitHub URL → GitHub API tree → fetch auditable files
    └── File upload → unzip to storage/app/audits/{id} → read directory

Stage 2: ClaudeSecurityProvider  (implements AiSecurityProvider)
    ├── Agentic loop, max 10 turns
    ├── Tools: flag_vulnerability, request_file_focus
    └── Broadcasts AuditProgressUpdated event per finding (SSE)

Stage 3: GeminiSecurityProvider  (implements AiSecurityProvider)
    ├── Single-pass, responseMimeType: application/json
    └── Auth: ?key=GEMINI_API_KEY in URL — no extra headers

Stage 4: FindingReconciliationService
    ├── confirmed  → both agree, line within ±5  → confidence 0.95
    ├── claude_only → Claude only               → confidence 0.65
    └── gemini_only → Gemini only               → confidence 0.65

Stage 5: CveService
    └── OSV API (free) → enrich insecure_dependency findings
```

## Backend File Map (what to build)

```
app/
├── Console/Commands/
│   ├── TestClaudeConnection.php    # artisan audithawk:test-claude
│   └── TestGeminiConnection.php    # artisan audithawk:test-gemini
├── Contracts/
│   └── AiSecurityProvider.php      # interface: scanCodebase(), getProviderName()
├── Events/
│   └── AuditProgressUpdated.php    # ShouldBroadcast, channel: audit.{id}
├── Http/Controllers/
│   └── AuditController.php         # submit(), show(), stream(), index()
├── Jobs/
│   └── RunAuditJob.php             # $timeout=600, $tries=1
├── Models/
│   ├── AuditReport.php             # HasUuids, hasMany(AuditFinding)
│   └── AuditFinding.php            # HasUuids, belongsTo(AuditReport)
└── Services/
    ├── Providers/
    │   ├── ClaudeSecurityProvider.php
    │   └── GeminiSecurityProvider.php
    ├── AuditPipelineService.php
    ├── CveService.php
    ├── FindingReconciliationService.php
    └── RepoIngestionService.php

config/audithawk.php    ← already exists — do not recreate
```

## Frontend File Map (what to build — Inertia pages)

```
resources/js/
├── pages/audit/
│   ├── Index.tsx       # Input screen — URL field + file upload
│   └── Show.tsx        # Report screen — summary stats + findings list
│
├── components/audit/
│   ├── UrlInput.tsx
│   ├── FileUpload.tsx
│   ├── StageTracker.tsx        # Loading: animated pipeline stages
│   ├── LiveFindingFeed.tsx     # Loading: SSE findings as they arrive
│   ├── SummaryStats.tsx        # Report: 6 severity stat cards
│   ├── EngineRow.tsx           # Report: engines used + consensus legend
│   ├── FindingCard.tsx         # Report: collapsible finding detail
│   └── ConfidenceBar.tsx       # Report: visual 0–1 bar
│
├── hooks/audit/
│   ├── useAudit.ts             # Master state: submit → poll → complete
│   └── useSSEStream.ts         # EventSource lifecycle — NOT Inertia router
│
├── constants/audit.ts          # SEVERITY, CONSENSUS, STAGES, STAT_CARDS
└── utils/audit.ts              # cvssToColor, formatDateTime, sortFindings
```

The audit `Index.tsx` page manages three UI states (`input` | `loading` | `report`) in React state — no separate Inertia page navigation between them. Use `useAudit` hook for all state transitions.

## API Contract (audit routes only — not Inertia routes)

| Method | Path                       | Controller method |
|--------|----------------------------|-------------------|
| POST   | `/api/audits`              | `submit()`        |
| GET    | `/api/audits`              | `index()`         |
| GET    | `/api/audits/{id}`         | `show()`          |
| GET    | `/api/audits/{id}/stream`  | `stream()`        |

`submit()` returns 202 `{ audit_id, status: "pending", message }`.
`stream()` returns `text/event-stream` with `X-Accel-Buffering: no`, polling every 2s, 5-min timeout.

SSE event types: `connected`, `stage`, `finding`, `focus`, `status`, `done`, `error`.

Finding shape reference:
```
type            string   sql_injection | xss | hardcoded_secret | broken_auth |
                         insecure_dependency | path_traversal | ssrf | idor | rce |
                         misconfigured_permissions
severity        string   critical | high | medium | low
cvss_score      float    0.0–10.0
consensus       string   confirmed | claude_only | gemini_only
confidence_score float   0.95 (confirmed) | 0.65 (single engine)
fix_suggestions object   { primary: string|null, alternative: string|null }
reasoning_trace string[] steps — may be empty for gemini_only
```

## Design Tokens (match these exactly in Tailwind/inline styles)

| Token      | Value       | Usage                              |
|------------|-------------|------------------------------------|
| Background | `#060608`   | Page base                          |
| Surface    | `#0d0d12`   | Cards, inputs                      |
| Border     | `white/7`   | Dividers, card edges               |
| Text       | `#e8e8f0`   | Primary readable text              |
| Muted      | `#666680`   | Labels, placeholders               |
| Accent     | `#00e5ff`   | Confirmed, Claude, interactive CTA |
| Accent2    | `#a78bfa`   | Gemini, secondary highlights       |

Severity colours: `critical=#ff3b3b`, `high=#ff8c00`, `medium=#f5c518`, `low=#4caf50`.

## Key Constraints

| Constraint            | Value         | Location                      |
|-----------------------|---------------|-------------------------------|
| Max files per audit   | 50            | `audithawk.audit.max_files`   |
| Max file size         | 100KB         | `audithawk.audit.max_file_size` |
| Audit job timeout     | 10 minutes    | `RunAuditJob::$timeout`       |
| Claude agentic turns  | 10 max        | `ClaudeSecurityProvider`      |
| Queue retries         | 1 (no retry)  | `RunAuditJob::$tries`         |
| SSE stream timeout    | 5 minutes     | `AuditController::stream()`   |
| CVE cache duration    | 24 hours      | `CveService`                  |

## Service Provider Bindings

All services are singletons in `AppServiceProvider::register()`. `boot()` throws `RuntimeException` if `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` are missing (skipped when `app()->runningUnitTests()`).

## Test Commands (Artisan)

```bash
php artisan audithawk:test-claude   # send a vulnerable PHP snippet to Claude
php artisan audithawk:test-gemini   # send a vulnerable PHP snippet to Gemini
```

Both dump JSON findings to console — run to confirm API keys work before full pipeline.

---

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.4
- inertiajs/inertia-laravel (INERTIA_LARAVEL) - v3
- laravel/fortify (FORTIFY) - v1
- laravel/framework (LARAVEL) - v13
- laravel/prompts (PROMPTS) - v0
- laravel/wayfinder (WAYFINDER) - v0
- laravel/boost (BOOST) - v2
- laravel/mcp (MCP) - v0
- laravel/pail (PAIL) - v1
- laravel/pint (PINT) - v1
- laravel/sail (SAIL) - v1
- phpunit/phpunit (PHPUNIT) - v12
- @inertiajs/react (INERTIA_REACT) - v3
- react (REACT) - v19
- tailwindcss (TAILWINDCSS) - v4
- @laravel/vite-plugin-wayfinder (WAYFINDER_VITE) - v0
- eslint (ESLINT) - v9
- prettier (PRETTIER) - v3

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Always use `search-docs` before making code changes. Do not skip this step. It returns version-specific docs based on installed packages automatically.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- New v3 features: standalone HTTP requests (`useHttp` hook), optimistic updates with automatic rollback, layout props (`useLayoutProps` hook), instant visits, simplified SSR via `@inertiajs/vite` plugin, custom exception handling for error pages.
- Carried over from v2: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.
- Axios has been removed. Use the built-in XHR client with interceptors, or install Axios separately if needed.
- `Inertia::lazy()` / `LazyProp` has been removed. Use `Inertia::optional()` instead.
- Prop types (`Inertia::optional()`, `Inertia::defer()`, `Inertia::merge()`) work inside nested arrays with dot-notation paths.
- SSR works automatically in Vite dev mode with `@inertiajs/vite` - no separate Node.js server needed during development.
- Event renames: `invalid` is now `httpException`, `exception` is now `networkError`.
- `router.cancel()` replaced by `router.cancelAll()`.
- The `future` configuration namespace has been removed - all v2 future options are now always enabled.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== wayfinder/core rules ===

# Laravel Wayfinder

Use Wayfinder to generate TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== phpunit/core rules ===

# PHPUnit

- This application uses PHPUnit for testing. All tests must be written as PHPUnit classes. Use `php artisan make:test --phpunit {name}` to create a new test.
- If you see a test using "Pest", convert it to PHPUnit.
- Every time a test has been updated, run that singular test.
- When the tests relating to your feature are passing, ask the user if they would like to also run the entire test suite to make sure everything is still passing.
- Tests should cover all happy paths, failure paths, and edge cases.
- You must not remove any tests or test files from the tests directory without approval. These are not temporary or helper files; these are core to the application.

## Running Tests

- Run the minimal number of tests, using an appropriate filter, before finalizing.
- To run all tests: `php artisan test --compact`.
- To run all tests in a file: `php artisan test --compact tests/Feature/ExampleTest.php`.
- To filter on a particular test name: `php artisan test --compact --filter=testName` (recommended after making a change to a related file).

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

</laravel-boost-guidelines>
