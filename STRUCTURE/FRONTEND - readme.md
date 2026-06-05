# AuditHawk — Frontend
### Independent React Application
> Three-screen SPA | Vite + React + Tailwind CSS

---

## Overview

AuditHawk Frontend is a fully independent React application. It has no knowledge of
the backend's implementation — it communicates exclusively through a versioned REST API
and a Server-Sent Events (SSE) stream. It can be developed, deployed, and run entirely
separately from the Laravel backend.

```
audithawk-frontend/     ← this repo, completely standalone
audithawk-backend/      ← separate repo, separate team
```

The only shared contract between the two repos is the API specification documented in
the [API Contract](#api-contract) section below.

---

## Table of Contents

1. [Tech Stack Decision](#1-tech-stack-decision)
2. [Project Scaffolding](#2-project-scaffolding)
3. [Dependencies](#3-dependencies)
4. [Project Structure](#4-project-structure)
5. [Environment Variables](#5-environment-variables)
6. [API Contract](#6-api-contract)
7. [Application State Machine](#7-application-state-machine)
8. [Phase 1 — API Layer](#8-phase-1--api-layer)
9. [Phase 2 — Custom Hooks](#9-phase-2--custom-hooks)
10. [Phase 3 — Constants & Config](#10-phase-3--constants--config)
11. [Phase 4 — Screen 1: Input](#11-phase-4--screen-1-input)
12. [Phase 5 — Screen 2: Loading](#12-phase-5--screen-2-loading)
13. [Phase 6 — Screen 3: Report](#13-phase-6--screen-3-report)
14. [Phase 7 — Shared Components](#14-phase-7--shared-components)
15. [Phase 8 — Styling System](#15-phase-8--styling-system)
16. [Phase 9 — App Root](#16-phase-9--app-root)
17. [Running the App](#17-running-the-app)
18. [Development Without the Backend](#18-development-without-the-backend)
19. [Complete File Map](#19-complete-file-map)
20. [Day-by-Day Build Plan](#20-day-by-day-build-plan)
21. [Demo Guide](#21-demo-guide)

---

## 1. Tech Stack Decision

### Option A — Vite + React (Recommended for hackathon)

Fastest setup, zero configuration, ideal for a hackathon timeline.
No server-side rendering needed since the app is entirely client-side.

```
Vite + React + React Router + Tailwind CSS
```

Choose this if: you want to move fast and the app does not need SEO.

### Option B — Next.js (If you want a framework)

More structure, file-based routing, built-in API proxying.
Slight overhead in setup but better long-term architecture.

```
Next.js (App Router) + Tailwind CSS
```

Choose this if: you want `/audit/[id]` deep-link URLs or plan to add
server-side logic later (e.g. proxying API keys through Next.js API routes
so the backend URL never hits the browser).

### This guide uses Option A — Vite + React

All code in this document applies to Vite + React. The structure translates
directly to Next.js with minor routing adjustments noted inline where relevant.

---

## 2. Project Scaffolding

### Vite + React

```bash
npm create vite@latest audithawk-frontend -- --template react
cd audithawk-frontend
npm install
```

### Next.js (alternative)

```bash
npx create-next-app@latest audithawk-frontend \
  --typescript=false \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias
cd audithawk-frontend
```

---

## 3. Dependencies

```bash
# Tailwind CSS (skip if using Next.js — it installs it for you)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Routing
npm install react-router-dom          # Vite only — Next.js has its own router

# HTTP / streaming
# No library needed — native fetch() and EventSource handle everything

# Icons — lightweight, tree-shakeable
npm install lucide-react

# Animations — optional but impressive for demo
npm install framer-motion
```

**No Axios required.** The native `fetch()` API handles all requests.
The native `EventSource` API handles SSE streaming.
Keeping dependencies minimal means fewer things to break on demo day.

---

## 4. Project Structure

```
audithawk-frontend/
├── public/
│   └── favicon.svg
│
├── src/
│   ├── api/
│   │   └── auditApi.js            # Every backend call lives here — one file
│   │
│   ├── hooks/
│   │   ├── useAudit.js            # Master state machine: submit → poll → complete
│   │   └── useSSEStream.js        # SSE EventSource lifecycle management
│   │
│   ├── screens/
│   │   ├── InputScreen.jsx        # Screen 1 — URL input + file upload
│   │   ├── LoadingScreen.jsx      # Screen 2 — live stage tracker + SSE trace
│   │   └── ReportScreen.jsx       # Screen 3 — severity dashboard + findings
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Nav.jsx            # Sticky top nav
│   │   │
│   │   ├── input/
│   │   │   ├── UrlInput.jsx       # GitHub URL field + submit button
│   │   │   └── FileUpload.jsx     # Drag-and-drop zip uploader
│   │   │
│   │   ├── loading/
│   │   │   ├── StageTracker.jsx   # Animated pipeline stages
│   │   │   └── LiveFindingFeed.jsx # Live findings as SSE events arrive
│   │   │
│   │   └── report/
│   │       ├── SummaryStats.jsx   # Six severity stat cards
│   │       ├── EngineRow.jsx      # Engine metadata + consensus legend
│   │       ├── FindingCard.jsx    # Collapsible finding — full detail on expand
│   │       └── ConfidenceBar.jsx  # Visual 0–1 confidence score bar
│   │
│   ├── constants/
│   │   └── audit.js               # Severity colours, consensus badges, stage labels
│   │
│   ├── utils/
│   │   └── formatters.js          # CVSS colour mapping, date helpers, sort
│   │
│   ├── App.jsx                    # Root component — screen state machine
│   ├── index.css                  # Tailwind directives + CSS variables
│   └── main.jsx                   # Vite entry point
│
├── index.html
├── tailwind.config.js
├── vite.config.js
└── .env
```

---

## 5. Environment Variables

```env
# .env  (development)
VITE_API_BASE_URL=http://localhost:8000/api
```

```env
# .env.production
VITE_API_BASE_URL=https://api.audithawk.com/api
```

Access in code:

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL;
```

> **Next.js equivalent:** use `NEXT_PUBLIC_API_BASE_URL` — the `NEXT_PUBLIC_`
> prefix is required for values to be available in the browser.

---

## 6. API Contract

This is the only thing the frontend cares about from the backend.
Do not import any backend code. Do not share any files between repos.

### Endpoints

| Method | Path                       | Description                       |
|--------|----------------------------|-----------------------------------|
| POST   | `/api/audits`              | Submit GitHub URL or zip file     |
| GET    | `/api/audits/{id}`         | Poll audit status + full results  |
| GET    | `/api/audits/{id}/stream`  | SSE stream for live progress      |
| GET    | `/api/audits`              | List 20 most recent audits        |

---

### POST `/api/audits` — GitHub URL

```json
// Request body
{
  "source_type": "github_url",
  "repo_url": "https://github.com/owner/repo"
}
```

```json
// Response 202
{
  "audit_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Audit queued."
}
```

### POST `/api/audits` — File Upload

```
Content-Type: multipart/form-data
source_type: file_upload
file: <.zip binary, max 20MB>
```

---

### GET `/api/audits/{id}` — Status values

| `status`    | Meaning                                    |
|-------------|------------------------------------------- |
| `pending`   | Queued, not yet started                    |
| `running`   | Pipeline executing                         |
| `complete`  | Done — `findings` array is populated       |
| `failed`    | Error — `error` field contains the message |

### GET `/api/audits/{id}` — Complete response shape

```json
{
  "audit_id": "uuid",
  "status": "complete",
  "repo_name": "mutillidae",
  "repo_url": "https://github.com/webpwnized/mutillidae",
  "source_type": "github_url",
  "started_at": "2025-01-01T10:00:00Z",
  "completed_at": "2025-01-01T10:02:30Z",
  "error": null,
  "meta": {
    "engines_used": ["claude-sonnet-4", "gemini-2.0-flash"],
    "files_scanned": 38,
    "claude_count": 14,
    "gemini_count": 11,
    "confirmed_count": 9,
    "claude_only": 5,
    "gemini_only": 2,
    "total_findings": 16,
    "severity_counts": {
      "critical": 2,
      "high": 4,
      "medium": 7,
      "low": 3
    }
  },
  "summary": {
    "total": 16,
    "critical": 2,
    "high": 4,
    "medium": 7,
    "low": 3,
    "confirmed": 9
  },
  "findings": [
    {
      "id": "uuid",
      "type": "sql_injection",
      "severity": "critical",
      "cvss_score": 9.1,
      "file": "app/Http/Controllers/UserController.php",
      "line": 42,
      "description": "Raw SQL query constructed with unsanitized user input.",
      "consensus": "confirmed",
      "confidence_score": 0.95,
      "confirmed_by": ["claude", "gemini"],
      "fix_suggestions": {
        "primary": "Use parameterized queries: DB::select('... WHERE id = ?', [$id])",
        "alternative": "Switch to Eloquent ORM to eliminate raw query exposure."
      },
      "cve_references": [],
      "reasoning_trace": [
        "Found DB::select() call on line 42",
        "Traced $request->id directly into query string",
        "No sanitization or binding found in scope"
      ]
    }
  ]
}
```

### Finding field reference

| Field              | Type            | Values / Notes                                         |
|--------------------|-----------------|--------------------------------------------------------|
| `type`             | string          | sql_injection, xss, hardcoded_secret, broken_auth, insecure_dependency, path_traversal, ssrf, idor, rce, misconfigured_permissions |
| `severity`         | string          | critical, high, medium, low                            |
| `cvss_score`       | float           | 0.0 – 10.0                                             |
| `consensus`        | string          | confirmed, claude_only, gemini_only                    |
| `confidence_score` | float           | 0.95 (confirmed) or 0.65 (single engine)               |
| `confirmed_by`     | string[]        | ["claude", "gemini"] or ["claude"] or ["gemini"]       |
| `fix_suggestions`  | object          | { primary: string\|null, alternative: string\|null }   |
| `reasoning_trace`  | string[]        | Array of reasoning steps — may be empty for Gemini-only |

---

### GET `/api/audits/{id}/stream` — SSE Event types

The browser connects with `new EventSource(url)`. Each event is a JSON string
sent as `data: {...}\n\n`.

```js
{ "type": "connected",  "audit_id": "uuid" }
{ "type": "stage",      "message": "Claude is performing deep analysis...", "stage": 1 }
{ "type": "finding",    "engine": "claude", "finding": { ...finding object... } }
{ "type": "focus",      "engine": "claude", "file": "path/file.php", "reason": "..." }
{ "type": "status",     "status": "running" }
{ "type": "done",       "status": "complete" }
{ "type": "error",      "message": "Audit failed: ..." }
```

Close the `EventSource` when you receive `type: done` or `type: error`.

---

## 7. Application State Machine

The app has exactly three screens driven by a single state value.
No complex routing library needed for the core experience.

```
              ┌─────────────────────────────────┐
              │         screen = 'input'         │ ◄── initial state
              │                                  │ ◄── after reset
              └──────────┬──────────────────┬────┘
                         │                  │
              user submits URL         user submits file
              POST /api/audits         POST /api/audits
                         │                  │
                         └────────┬─────────┘
                                  │ on 202 success
                                  ▼
              ┌─────────────────────────────────┐
              │        screen = 'loading'        │
              │                                  │
              │  polling GET /api/audits/{id}    │
              │  every 3 seconds                 │
              │                                  │
              │  SSE GET /api/audits/{id}/stream │
              │  live stage + finding events     │
              └──────────┬──────────────────┬────┘
                         │                  │
              status = 'complete'    status = 'failed'
                         │                  │
                         ▼                  ▼
              ┌──────────────────┐  ┌──────────────────┐
              │ screen = 'report'│  │ screen = 'input'  │
              │                  │  │ (show error msg)  │
              │ full findings    │  └──────────────────┘
              │ dashboard        │
              └──────────┬───────┘
                         │
              user clicks "New Audit"
                         │
                         ▼
              screen = 'input' (reset)
```

---

## 8. Phase 1 — API Layer

One file. All backend communication. Nothing else imports `fetch` directly.

```js
// src/api/auditApi.js

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Submit GitHub URL ─────────────────────────────────────────────────────
export async function submitGithubAudit(repoUrl) {
  return handleResponse(
    await fetch(`${BASE}/audits`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ source_type: 'github_url', repo_url: repoUrl }),
    })
  );
}

// ── Submit zip file ───────────────────────────────────────────────────────
export async function submitFileAudit(file) {
  const form = new FormData();
  form.append('source_type', 'file_upload');
  form.append('file', file);
  // Do NOT set Content-Type — browser sets it automatically with boundary
  return handleResponse(
    await fetch(`${BASE}/audits`, { method: 'POST', body: form })
  );
}

// ── Poll single audit ─────────────────────────────────────────────────────
export async function getAudit(auditId) {
  return handleResponse(await fetch(`${BASE}/audits/${auditId}`));
}

// ── List recent audits ────────────────────────────────────────────────────
export async function listAudits() {
  return handleResponse(await fetch(`${BASE}/audits`));
}

// ── Open SSE stream ───────────────────────────────────────────────────────
// Returns an EventSource instance. Caller is responsible for closing it.
export function openAuditStream(auditId) {
  return new EventSource(`${BASE}/audits/${auditId}/stream`);
}
```

---

## 9. Phase 2 — Custom Hooks

### useSSEStream.js

Manages the EventSource connection. Auto-closes on terminal events.
Caller provides a callback that receives each parsed event payload.

```js
// src/hooks/useSSEStream.js

import { useEffect, useRef, useCallback } from 'react';
import { openAuditStream } from '../api/auditApi';

export function useSSEStream(auditId, onEvent) {
  const esRef = useRef(null);

  const close = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  useEffect(() => {
    if (!auditId) return;

    const es = openAuditStream(auditId);
    esRef.current = es;

    es.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        onEvent(payload);
        // Auto-close on terminal events
        if (payload.type === 'done' || payload.type === 'error') close();
      } catch (e) {
        console.warn('[SSE] parse error', e);
      }
    };

    es.onerror = () => {
      console.warn('[SSE] connection error — closing');
      close();
    };

    return close; // cleanup on unmount or auditId change
  }, [auditId]);

  return close;
}
```

---

### useAudit.js

The master hook. Owns all application state and coordinates
submit → poll → SSE → complete transitions.

```js
// src/hooks/useAudit.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { submitGithubAudit, submitFileAudit, getAudit } from '../api/auditApi';
import { useSSEStream } from './useSSEStream';

const POLL_INTERVAL_MS = 3000;

export function useAudit() {
  // ── Core state ────────────────────────────────────────────────────────────
  const [screen,       setScreen]       = useState('input');   // 'input'|'loading'|'report'
  const [auditId,      setAuditId]      = useState(null);
  const [report,       setReport]       = useState(null);
  const [submitError,  setSubmitError]  = useState(null);

  // ── Loading screen state ──────────────────────────────────────────────────
  const [currentStage, setCurrentStage] = useState(0);         // 0–5
  const [liveFindings, setLiveFindings] = useState([]);        // findings as they arrive

  const pollRef = useRef(null);

  // ── SSE stream ────────────────────────────────────────────────────────────
  useSSEStream(screen === 'loading' ? auditId : null, (payload) => {
    if (payload.type === 'stage')   setCurrentStage(payload.stage ?? 0);
    if (payload.type === 'finding') setLiveFindings(prev => [...prev, payload.finding]);
  });

  // ── Polling ───────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const startPolling = useCallback((id) => {
    pollRef.current = setInterval(async () => {
      try {
        const data = await getAudit(id);

        if (data.status === 'complete') {
          stopPolling();
          setReport(data);
          setScreen('report');
        }

        if (data.status === 'failed') {
          stopPolling();
          setSubmitError(data.error || 'Audit failed. Please try again.');
          setScreen('input');
        }
      } catch (err) {
        console.error('[Poll] error:', err.message);
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Shared submit handler ─────────────────────────────────────────────────
  const handleSubmitResult = useCallback(({ audit_id }) => {
    setAuditId(audit_id);
    setCurrentStage(0);
    setLiveFindings([]);
    setScreen('loading');
    startPolling(audit_id);
  }, [startPolling]);

  // ── Public actions ────────────────────────────────────────────────────────
  const submitUrl = useCallback(async (url) => {
    setSubmitError(null);
    try {
      const result = await submitGithubAudit(url);
      handleSubmitResult(result);
    } catch (err) {
      setSubmitError('Could not start audit. Check the URL and try again.');
    }
  }, [handleSubmitResult]);

  const submitFile = useCallback(async (file) => {
    setSubmitError(null);
    try {
      const result = await submitFileAudit(file);
      handleSubmitResult(result);
    } catch (err) {
      setSubmitError('Upload failed. Ensure the file is a .zip under 20MB.');
    }
  }, [handleSubmitResult]);

  const reset = useCallback(() => {
    stopPolling();
    setScreen('input');
    setAuditId(null);
    setReport(null);
    setSubmitError(null);
    setCurrentStage(0);
    setLiveFindings([]);
  }, [stopPolling]);

  return {
    // Screen routing
    screen,
    // Loading screen
    auditId,
    currentStage,
    liveFindings,
    // Report screen
    report,
    // Error state
    submitError,
    // Actions
    submitUrl,
    submitFile,
    reset,
  };
}
```

---

## 10. Phase 3 — Constants & Config

All visual configuration lives in one file. Components import from here —
never hardcode colours or labels inline.

```js
// src/constants/audit.js

// ── Severity ──────────────────────────────────────────────────────────────
export const SEVERITY = {
  critical: { color: '#ff3b3b', bg: '#1a0505', label: 'CRITICAL', order: 0 },
  high:     { color: '#ff8c00', bg: '#1a0e00', label: 'HIGH',     order: 1 },
  medium:   { color: '#f5c518', bg: '#1a1600', label: 'MEDIUM',   order: 2 },
  low:      { color: '#4caf50', bg: '#051a05', label: 'LOW',      order: 3 },
};

// ── Consensus ─────────────────────────────────────────────────────────────
export const CONSENSUS = {
  confirmed:   { icon: '⬡', label: 'Confirmed by both AIs', color: '#00e5ff' },
  claude_only: { icon: '◈', label: 'Claude only',           color: '#a78bfa' },
  gemini_only: { icon: '◇', label: 'Gemini only',           color: '#34d399' },
};

// ── Audit pipeline stages (mirrors backend SSE stage numbers) ─────────────
export const STAGES = [
  { id: 1, icon: '⬡', label: 'Ingesting repository files...'     },
  { id: 2, icon: '◈', label: 'Claude: deep agentic analysis...'  },
  { id: 3, icon: '◇', label: 'Gemini: independent validation...' },
  { id: 4, icon: '⬟', label: 'Cross-referencing findings...'     },
  { id: 5, icon: '⬠', label: 'Enriching with CVE data...'        },
];

// ── Stat card config for summary bar ─────────────────────────────────────
export const STAT_CARDS = [
  { key: 'total',     label: 'Total',     color: '#a78bfa', border: '#a78bfa' },
  { key: 'confirmed', label: 'Confirmed', color: '#00e5ff', border: '#00e5ff' },
  { key: 'critical',  label: 'Critical',  color: '#ff3b3b', border: '#ff3b3b' },
  { key: 'high',      label: 'High',      color: '#ff8c00', border: '#ff8c00' },
  { key: 'medium',    label: 'Medium',    color: '#f5c518', border: '#f5c518' },
  { key: 'low',       label: 'Low',       color: '#4caf50', border: '#4caf50' },
];
```

```js
// src/utils/formatters.js

import { SEVERITY } from '../constants/audit';

export function cvssToColor(score) {
  if (score >= 9.0) return SEVERITY.critical.color;
  if (score >= 7.0) return SEVERITY.high.color;
  if (score >= 4.0) return SEVERITY.medium.color;
  return SEVERITY.low.color;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function sortFindings(findings = []) {
  return [...findings].sort((a, b) => {
    const ao = SEVERITY[a.severity]?.order ?? 99;
    const bo = SEVERITY[b.severity]?.order ?? 99;
    if (ao !== bo) return ao - bo;
    return (b.cvss_score || 0) - (a.cvss_score || 0);
  });
}
```

---

## 11. Phase 4 — Screen 1: Input

### InputScreen.jsx

```jsx
// src/screens/InputScreen.jsx

import { useState } from 'react';
import UrlInput from '../components/input/UrlInput';
import FileUpload from '../components/input/FileUpload';

export default function InputScreen({ onSubmitUrl, onSubmitFile, error }) {
  const [mode, setMode] = useState('url'); // 'url' | 'file'

  return (
    <main className="max-w-2xl mx-auto px-6 pt-24 pb-16 text-center">

      {/* Eyebrow */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <span className="block w-8 h-px bg-[#00e5ff] opacity-40" />
        <span className="font-mono text-xs tracking-widest text-[#00e5ff] uppercase">
          Autonomous Security Audit Agent
        </span>
        <span className="block w-8 h-px bg-[#00e5ff] opacity-40" />
      </div>

      {/* Headline */}
      <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tighter
                     text-white mb-5">
        Find vulnerabilities<br />
        <span className="text-[#00e5ff]">before attackers do</span>
      </h1>

      {/* Sub */}
      <p className="text-[#666680] text-base leading-relaxed max-w-md mx-auto mb-10">
        Submit a GitHub repository or a zip file. Claude and Gemini independently
        audit your codebase and cross-reference findings for verified results.
      </p>

      {/* Mode toggle */}
      <div className="flex justify-center gap-2 mb-6">
        {[
          { id: 'url',  label: 'GitHub URL'  },
          { id: 'file', label: 'Upload ZIP'  },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest
                        border transition-all
                        ${mode === m.id
                          ? 'border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/10'
                          : 'border-white/7 text-[#666680] hover:border-[#00e5ff]/40'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input */}
      {mode === 'url'
        ? <UrlInput  onSubmit={onSubmitUrl} />
        : <FileUpload onSubmit={onSubmitFile} />
      }

      {/* Error */}
      {error && (
        <p className="mt-4 font-mono text-sm text-red-400">{error}</p>
      )}

      {/* Feature tags */}
      <div className="flex flex-wrap justify-center gap-3 mt-10">
        {['Claude Sonnet', 
        //'Gemini Flash', 
        'CVSS Scoring', 'CVE Cross-Reference',
          'Dual-Engine Confidence'].map(tag => (
          <span key={tag}
            className="font-mono text-xs text-[#666680] border border-white/7
                       px-3 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </main>
  );
}
```

### UrlInput.jsx

```jsx
// src/components/input/UrlInput.jsx

import { useState } from 'react';

export default function UrlInput({ onSubmit }) {
  const [url,     setUrl]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    await onSubmit(url.trim());
    setLoading(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-[#0d0d12] border border-white/7
                      rounded-2xl px-5 py-1 focus-within:border-[#00e5ff]/40
                      transition-colors">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="https://github.com/owner/repository"
          disabled={loading}
          className="flex-1 bg-transparent outline-none font-mono text-sm
                     text-[#e8e8f0] placeholder-[#666680] py-3"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !url.trim()}
          className="flex-shrink-0 bg-[#00e5ff] text-black font-bold text-sm
                     px-5 py-2.5 rounded-xl transition-all
                     hover:opacity-85 hover:-translate-y-px
                     disabled:opacity-40 disabled:cursor-not-allowed
                     disabled:transform-none"
        >
          {loading ? 'Starting…' : 'Audit →'}
        </button>
      </div>
      <p className="mt-2 text-left font-mono text-xs text-[#666680]">
        Paste any public GitHub repository URL
      </p>
    </>
  );
}
```

### FileUpload.jsx

```jsx
// src/components/input/FileUpload.jsx

import { useState, useRef } from 'react';

export default function FileUpload({ onSubmit }) {
  const [file,    setFile]    = useState(null);
  const [over,    setOver]    = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const accept = f => f?.name?.endsWith('.zip') ? setFile(f) : null;

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    await onSubmit(file);
    setLoading(false);
  };

  return (
    <>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true);  }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer
                    text-center transition-colors select-none
                    ${over || file
                      ? 'border-[#00e5ff] bg-[#00e5ff]/5'
                      : 'border-white/7 hover:border-[#00e5ff]/40'}`}
      >
        <p className="text-sm font-semibold text-[#e8e8f0]">
          {file ? `✓  ${file.name}` : 'Drop your zip here, or click to browse'}
        </p>
        <p className="font-mono text-xs text-[#666680] mt-1">.zip only — max 20MB</p>
      </div>

      <input
        ref={inputRef} type="file" accept=".zip"
        className="hidden"
        onChange={e => accept(e.target.files[0])}
      />

      {file && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full bg-[#00e5ff] text-black font-bold text-sm
                     py-3 rounded-xl transition-all hover:opacity-85
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading…' : `Audit  ${file.name}  →`}
        </button>
      )}
    </>
  );
}
```

---

## 12. Phase 5 — Screen 2: Loading

### LoadingScreen.jsx

```jsx
// src/screens/LoadingScreen.jsx

import StageTracker from '../components/loading/StageTracker';
import LiveFindingFeed from '../components/loading/LiveFindingFeed';
import { STAGES } from '../constants/audit';

export default function LoadingScreen({ auditId, currentStage, liveFindings }) {
  return (
    <main className="max-w-lg mx-auto px-6 py-16">

      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#00e5ff]
                        animate-spin flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Audit in progress</p>
          <p className="font-mono text-xs text-[#00e5ff] truncate">ID: {auditId}</p>
        </div>
      </div>

      {/* Stage tracker */}
      <StageTracker stages={STAGES} activeIndex={currentStage} />

      {/* Live findings feed */}
      {liveFindings.length > 0 && (
        <LiveFindingFeed findings={liveFindings} />
      )}

      <p className="font-mono text-xs text-[#666680] text-center mt-8">
        Audits typically complete in 1–3 minutes
      </p>
    </main>
  );
}
```

### StageTracker.jsx

```jsx
// src/components/loading/StageTracker.jsx

export default function StageTracker({ stages, activeIndex }) {
  return (
    <div className="space-y-1">
      {stages.map((stage, i) => {
        const done    = i < activeIndex;
        const active  = i === activeIndex;
        const pending = i > activeIndex;

        return (
          <div key={stage.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
              ${active  ? 'bg-[#00e5ff]/5' : ''}
              ${pending ? 'opacity-20'      : ''}
              ${done    ? 'opacity-45'      : ''}`}
          >
            <span className={`text-base w-5 text-center flex-shrink-0
              ${active ? 'text-[#00e5ff]' : done ? 'text-green-400' : 'text-[#666680]'}`}>
              {stage.icon}
            </span>

            <span className={`text-sm flex-1
              ${active ? 'text-white font-semibold' : 'text-[#e8e8f0]'}`}>
              {stage.label}
            </span>

            {active && (
              <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse flex-shrink-0" />
            )}
            {done && (
              <span className="text-green-400 text-xs flex-shrink-0">✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### LiveFindingFeed.jsx

```jsx
// src/components/loading/LiveFindingFeed.jsx

import { SEVERITY } from '../../constants/audit';

export default function LiveFindingFeed({ findings }) {
  // Show only the 5 most recent to avoid overflow
  const recent = findings.slice(-5);

  return (
    <div className="mt-8">
      <p className="font-mono text-xs text-[#666680] uppercase tracking-wider mb-3">
        Live findings — {findings.length} so far
      </p>
      <div className="space-y-2">
        {recent.map((f, i) => {
          const sev = SEVERITY[f?.severity] || SEVERITY.low;
          return (
            <div key={i}
              className="bg-[#0d0d12] border border-white/7 rounded-xl
                         px-4 py-3 flex items-center gap-3">
              <span
                className="font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                style={{ color: sev.color, background: sev.bg }}
              >
                {sev.label}
              </span>
              <span className="font-mono text-xs text-[#e8e8f0] flex-1 truncate">
                {f?.type?.replace(/_/g, ' ')}
              </span>
              <span className="font-mono text-xs text-[#666680] truncate max-w-[8rem] flex-shrink-0">
                {f?.file?.split('/').pop()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 13. Phase 6 — Screen 3: Report

### ReportScreen.jsx

```jsx
// src/screens/ReportScreen.jsx

import SummaryStats  from '../components/report/SummaryStats';
import EngineRow     from '../components/report/EngineRow';
import FindingCard   from '../components/report/FindingCard';
import { sortFindings } from '../utils/formatters';

export default function ReportScreen({ report, onReset }) {
  const { summary, meta, findings = [], repo_name, repo_url } = report;
  const sorted = sortFindings(findings);

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 pb-24">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {repo_name}
          </h2>
          {repo_url && (
            <a href={repo_url} target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs text-[#666680] hover:text-[#00e5ff]
                         transition-colors mt-1 inline-flex items-center gap-1">
              ⬡ {repo_url}
            </a>
          )}
        </div>
        <button onClick={onReset}
          className="border border-white/7 text-[#666680] text-xs font-bold
                     px-4 py-2 rounded-lg hover:border-[#00e5ff] hover:text-[#00e5ff]
                     transition-all flex-shrink-0">
          ← New Audit
        </button>
      </div>

      <SummaryStats summary={summary} />
      <EngineRow    meta={meta} findings={sorted} />

      {/* Section heading */}
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-xs font-bold text-[#666680] uppercase tracking-widest">
          Security Findings
        </span>
        <div className="flex-1 h-px bg-white/7" />
        <span className="font-mono text-xs text-[#666680]">
          {sorted.length} total · sorted by severity
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-[#666680] font-mono text-sm">
          No findings returned. The codebase may be clean or no auditable files were found.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(f => <FindingCard key={f.id} finding={f} />)}
        </div>
      )}
    </main>
  );
}
```

### SummaryStats.jsx

```jsx
// src/components/report/SummaryStats.jsx

import { STAT_CARDS } from '../../constants/audit';

export default function SummaryStats({ summary = {} }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
      {STAT_CARDS.map(({ key, label, color, border }) => (
        <div key={key}
          className="bg-[#0d0d12] border border-white/7 rounded-xl p-4
                     relative overflow-hidden"
          style={{ borderTop: `2px solid ${border}` }}
        >
          <div className="text-3xl font-extrabold leading-none" style={{ color }}>
            {summary[key] ?? 0}
          </div>
          <div className="text-xs text-[#666680] font-bold uppercase tracking-wider mt-1">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### EngineRow.jsx

```jsx
// src/components/report/EngineRow.jsx

import { CONSENSUS } from '../../constants/audit';

export default function EngineRow({ meta = {}, findings = [] }) {
  const counts = {
    confirmed:   findings.filter(f => f.consensus === 'confirmed').length,
    claude_only: findings.filter(f => f.consensus === 'claude_only').length,
    gemini_only: findings.filter(f => f.consensus === 'gemini_only').length,
  };

  return (
    <div className="mb-7 space-y-3">
      {/* Engines used */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-[#666680] uppercase tracking-wider">
          Engines
        </span>
        {(meta.engines_used || []).map((name, i) => (
          <span key={name}
            className="flex items-center gap-2 bg-[#0d0d12] border border-white/7
                       rounded-lg px-3 py-1.5 font-mono text-xs text-[#666680]">
            <span className="w-2 h-2 rounded-full"
              style={{ background: i === 0 ? '#a78bfa' : '#34d399' }} />
            {name}
          </span>
        ))}
        {meta.files_scanned != null && (
          <span className="ml-auto font-mono text-xs text-[#666680] bg-[#0d0d12]
                           border border-white/7 rounded-lg px-3 py-1.5">
            {meta.files_scanned} files scanned
          </span>
        )}
      </div>

      {/* Consensus legend */}
      <div className="flex flex-wrap gap-5">
        {Object.entries(counts).map(([key, count]) => {
          const c = CONSENSUS[key];
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span style={{ color: c.color }}>{c.icon}</span>
              <span className="font-mono font-semibold" style={{ color: c.color }}>
                {count}
              </span>
              <span className="text-[#666680]">{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### FindingCard.jsx

```jsx
// src/components/report/FindingCard.jsx

import { useState } from 'react';
import ConfidenceBar from './ConfidenceBar';
import { SEVERITY, CONSENSUS } from '../../constants/audit';

export default function FindingCard({ finding }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY[finding.severity]  || SEVERITY.low;
  const con = CONSENSUS[finding.consensus] || CONSENSUS.claude_only;

  return (
    <article className="bg-[#0d0d12] border border-white/7 rounded-2xl overflow-hidden
                        hover:border-white/[0.12] transition-colors">

      {/* Collapsed row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        {/* Severity pill */}
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0"
          style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.color}33` }}>
          {sev.label}
        </span>

        {/* Type */}
        <span className="font-mono text-sm text-white font-medium flex-shrink-0">
          {finding.type.replace(/_/g, ' ')}
        </span>

        {/* File : line */}
        <span className="font-mono text-xs text-[#666680] truncate flex-1 min-w-0">
          {finding.file}{finding.line ? `:${finding.line}` : ''}
        </span>

        {/* Consensus */}
        <span className="flex items-center gap-1.5 font-mono text-xs flex-shrink-0"
          style={{ color: con.color }}>
          {con.icon} {finding.confirmed_by?.join(' + ')}
        </span>

        {/* CVSS */}
        <span className="font-mono text-sm font-bold flex-shrink-0"
          style={{ color: sev.color }}>
          {finding.cvss_score?.toFixed(1)}
        </span>

        {/* Chevron */}
        <span className={`text-[#666680] text-[10px] flex-shrink-0 transition-transform duration-200
          ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-5 pb-5 border-t border-white/7">
          <p className="text-sm text-[#e8e8f0]/80 leading-relaxed py-4">
            {finding.description}
          </p>

          {/* Primary fix */}
          {finding.fix_suggestions?.primary && (
            <>
              <Label>Primary Fix — Claude</Label>
              <CodeBlock>{finding.fix_suggestions.primary}</CodeBlock>
            </>
          )}

          {/* Alternative fix */}
          {finding.fix_suggestions?.alternative && (
            <>
              <Label>Alternative Fix — Gemini</Label>
              <CodeBlock>{finding.fix_suggestions.alternative}</CodeBlock>
            </>
          )}

          {/* Reasoning trace */}
          {finding.reasoning_trace?.length > 0 && (
            <>
              <Label className="mt-4">Reasoning Trace</Label>
              <ul className="space-y-1 mb-3">
                {finding.reasoning_trace.map((step, i) => (
                  <li key={i} className="flex gap-2 font-mono text-xs text-[#666680]">
                    <span className="text-[#00e5ff] flex-shrink-0">→</span>
                    {step}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* CVE references */}
          {finding.cve_references?.length > 0 && (
            <div className="flex flex-wrap gap-2 my-3">
              {finding.cve_references.map(cve => (
                <span key={cve}
                  className="font-mono text-xs px-2 py-0.5 rounded border
                             text-red-300 bg-red-500/10 border-red-500/25">
                  {cve}
                </span>
              ))}
            </div>
          )}

          <ConfidenceBar score={finding.confidence_score} />
        </div>
      )}
    </article>
  );
}

function Label({ children, className = '' }) {
  return (
    <p className={`font-mono text-[10px] font-bold text-[#666680] uppercase
                   tracking-wider mb-2 ${className}`}>
      {children}
    </p>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="bg-black/30 border border-white/7 rounded-lg px-4 py-3
                    font-mono text-xs text-[#e8e8f0] leading-relaxed
                    whitespace-pre-wrap break-words mb-3">
      {children}
    </pre>
  );
}
```

### ConfidenceBar.jsx

```jsx
// src/components/report/ConfidenceBar.jsx

export default function ConfidenceBar({ score = 0 }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-3 mt-4">
      <span className="font-mono text-[10px] font-bold text-[#666680] uppercase
                       tracking-wider flex-shrink-0">
        Confidence
      </span>
      <div className="flex-1 h-1 bg-white/7 rounded-full overflow-hidden">
        <div className="h-full bg-[#00e5ff] rounded-full"
          style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
      <span className="font-mono text-xs text-[#666680] flex-shrink-0">{pct}%</span>
    </div>
  );
}
```

---

## 14. Phase 7 — Shared Components

### Nav.jsx

```jsx
// src/components/layout/Nav.jsx

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between
                    px-8 md:px-12 py-5 border-b border-white/7
                    bg-[#060608]/85 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#00e5ff] flex-shrink-0"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
          }}
        />
        <span className="text-lg font-extrabold tracking-tight text-white">
          AuditHawk
        </span>
      </div>
      <span className="font-mono text-xs text-[#666680] border border-white/7
                       px-3 py-1 rounded-md">
        dual-AI · v1.0
      </span>
    </nav>
  );
}
```

---

## 15. Phase 8 — Styling System

### Tailwind config

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Syne'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
};
```

### Global CSS

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  min-height: 100vh;
  background: #060608;
  color: #e8e8f0;
  font-family: 'Syne', sans-serif;
}
```

### index.html — Google Fonts

```html
<!-- index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet" />
```

### Design tokens reference

| Token      | Value                    | Usage                              |
|------------|--------------------------|------------------------------------|
| Background | `#060608`                | Page base                          |
| Surface    | `#0d0d12`                | Cards, inputs                      |
| Border     | `rgba(255,255,255,0.07)` | Dividers, card edges               |
| Text       | `#e8e8f0`                | Primary readable text              |
| Muted      | `#666680`                | Labels, placeholders               |
| Accent     | `#00e5ff`                | Claude, confirmed, interactive CTA |
| Accent2    | `#a78bfa`                | Gemini, secondary highlights       |

---

## 16. Phase 9 — App Root

```jsx
// src/App.jsx

import { useAudit } from './hooks/useAudit';
import Nav           from './components/layout/Nav';
import InputScreen   from './screens/InputScreen';
import LoadingScreen from './screens/LoadingScreen';
import ReportScreen  from './screens/ReportScreen';

export default function App() {
  const {
    screen, auditId, report,
    submitError, liveFindings, currentStage,
    submitUrl, submitFile, reset,
  } = useAudit();

  return (
    <div className="min-h-screen bg-[#060608]"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 60% 40% at 50% -10%, rgba(0,229,255,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 90% 80%,  rgba(167,139,250,0.04) 0%, transparent 60%)
        `,
      }}
    >
      <Nav />

      {screen === 'input' && (
        <InputScreen
          onSubmitUrl={submitUrl}
          onSubmitFile={submitFile}
          error={submitError}
        />
      )}

      {screen === 'loading' && (
        <LoadingScreen
          auditId={auditId}
          currentStage={currentStage}
          liveFindings={liveFindings}
        />
      )}

      {screen === 'report' && (
        <ReportScreen report={report} onReset={reset} />
      )}
    </div>
  );
}
```

```jsx
// src/main.jsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
```

---

## 17. Running the App

```bash
# Install
npm install

# Development (hot reload)
npm run dev
# App available at http://localhost:5173

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 18. Development Without the Backend

You do not need the backend running to build and style the frontend.
Use mock data and mock API responses during frontend development.

### Create a mock flag

```js
// src/api/auditApi.js — add at top

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
```

```env
# .env.development.local
VITE_USE_MOCK=true
```

### Mock submit — instant response

```js
export async function submitGithubAudit(repoUrl) {
  if (USE_MOCK) {
    await delay(800);
    return { audit_id: 'mock-audit-001', status: 'pending', message: 'Mock audit queued.' };
  }
  // ... real fetch
}
```

### Mock poll — simulate stages over time

```js
export async function getAudit(auditId) {
  if (USE_MOCK) {
    const elapsed = (Date.now() - mockStartTime) / 1000;
    if (elapsed < 13) return { audit_id: auditId, status: 'running', findings: [] };
    return MOCK_REPORT;
  }
  // ... real fetch
}
```

### MOCK_REPORT object

Keep a `src/mocks/report.js` file with a realistic mock report matching the
full API response shape from the API Contract section. Use real CVE IDs,
realistic file paths, and actual vulnerability descriptions to make the demo
convincing even when running against mock data.

---

## 19. Complete File Map

```
audithawk-frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/
│   │   └── auditApi.js
│   ├── hooks/
│   │   ├── useAudit.js
│   │   └── useSSEStream.js
│   ├── screens/
│   │   ├── InputScreen.jsx
│   │   ├── LoadingScreen.jsx
│   │   └── ReportScreen.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   └── Nav.jsx
│   │   ├── input/
│   │   │   ├── UrlInput.jsx
│   │   │   └── FileUpload.jsx
│   │   ├── loading/
│   │   │   ├── StageTracker.jsx
│   │   │   └── LiveFindingFeed.jsx
│   │   └── report/
│   │       ├── SummaryStats.jsx
│   │       ├── EngineRow.jsx
│   │       ├── FindingCard.jsx
│   │       └── ConfidenceBar.jsx
│   ├── constants/
│   │   └── audit.js
│   ├── utils/
│   │   └── formatters.js
│   ├── mocks/
│   │   └── report.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── tailwind.config.js
├── vite.config.js
└── .env
```

---

## 20. Day-by-Day Build Plan

### Day 2 — Scaffold & static screens

```
□ npm create vite, install Tailwind, fonts, lucide-react
□ Build Nav — static, no logic
□ Build InputScreen with UrlInput — hardcoded onSubmit that logs to console
□ Build LoadingScreen with StageTracker — static activeIndex prop
□ Build ReportScreen with SummaryStats + EngineRow — hardcoded mock data
□ Wire up App.jsx state machine — buttons transition between screens manually
□ Goal: all three screens render and look correct
```

### Day 3 — Live API integration

```
□ Create auditApi.js with all five functions
□ Create useSSEStream.js
□ Create useAudit.js — connect submitUrl, poll, SSE
□ Replace mock transitions in App.jsx with real useAudit hook
□ Build LiveFindingFeed — connect to liveFindings from useAudit
□ Build FindingCard — static, no expand yet
□ Test end-to-end against backend with a real repo URL
□ Goal: full flow works — submit → loading → report
```

### Day 4 — Polish & edge cases

```
□ FindingCard expand/collapse with reasoning trace, fix suggestions, CVEs
□ ConfidenceBar animation
□ FileUpload drag-and-drop
□ Empty state (no findings returned)
□ Failed audit error handling — show message, go back to input
□ Responsive layout — test on mobile viewport
□ Sync with backend teammate: confirm all response fields render correctly
```

### Day 5 — Demo prep

```
□ Run against DVWA — validate all finding types render without crashes
□ Add VITE_USE_MOCK mode for offline demo fallback
□ Record demo flow screen capture: submit → loading → report → expand finding
□ Final spacing, font size, colour pass
```

---

## 21. Demo Guide

### Best repos to use

```
https://github.com/webpwnized/mutillidae   ← Best — PHP, 10+ clear findings in ~2 min
https://github.com/digininja/DVWA          ← Backup — well known, predictable output
```

### What to show judges

```
1. Input screen  → paste Mutillidae URL → click Audit →
2. Loading       → stages tick off one by one
3. Loading       → live findings appear in real time as Claude flags them
4. Report        → stat cards: 2 critical, 4 high, etc.
5. Report        → engine row: "claude-sonnet-4 + gemini-2.0-flash · 38 files scanned"
6. Report        → click a confirmed critical finding to expand
7. Expanded      → show reasoning trace: "→ Found DB::select() on line 42 → traced..."
8. Expanded      → show both fix suggestions: primary from Claude, alternative from Gemini
9. Expanded      → show confidence bar at 95%
10. Point out    → "Two AIs found this independently — that's why it's confirmed at 0.95"
```

### Key demo lines

- *"Claude runs an agentic loop — it uses tool calls to flag each finding, which is
  why you see them appear in real time as the stream arrives."*
- *"Gemini scans independently in parallel. When both agree on a vulnerability, we
  surface it as confirmed. That confidence score is what separates this from a
  traditional single-engine scanner."*
- *"The reasoning trace shows exactly how Claude reasoned its way to the finding.
  Not just what is vulnerable — but why, and the full exploit chain."*

---

*AuditHawk Frontend — Independent React Application*
