import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000/api";

// ─── Severity config ────────────────────────────────────────────────────────
const SEVERITY = {
  critical: { color: "#ff3b3b", bg: "#1a0505", label: "CRITICAL", order: 0 },
  high:     { color: "#ff8c00", bg: "#1a0e00", label: "HIGH",     order: 1 },
  medium:   { color: "#f5c518", bg: "#1a1600", label: "MEDIUM",   order: 2 },
  low:      { color: "#4caf50", bg: "#051a05", label: "LOW",      order: 3 },
};

const CONSENSUS = {
  confirmed:   { icon: "⬡", label: "Confirmed by both AIs", color: "#00e5ff" },
  claude_only: { icon: "◈",  label: "Claude only",          color: "#a78bfa" },
  gemini_only: { icon: "◇",  label: "Gemini only",          color: "#34d399" },
};

// ─── Mock data for demo ──────────────────────────────────────────────────────
const MOCK_REPORT = {
  repo_name: "mutillidae",
  repo_url: "https://github.com/webpwnized/mutillidae",
  completed_at: new Date().toISOString(),
  meta: {
    engines_used: ["claude-sonnet-4", "gemini-2.0-flash"],
    files_scanned: 42,
    claude_count: 18,
    gemini_count: 14,
    confirmed_count: 11,
    claude_only: 7,
    gemini_only: 3,
  },
  summary: { total: 21, critical: 3, high: 6, medium: 8, low: 4, confirmed: 11 },
  findings: [
    {
      id: "1", type: "sql_injection", severity: "critical", cvss_score: 9.1,
      file: "app/Http/Controllers/UserController.php", line: 42,
      description: "Raw SQL query constructed with unsanitized user input from $request->email. An attacker can manipulate the query logic to bypass authentication or dump the entire users table.",
      consensus: "confirmed", confidence_score: 0.95, confirmed_by: ["claude", "gemini"],
      fix_suggestions: {
        primary: "Replace raw query with parameterized binding: DB::select('SELECT * FROM users WHERE email = ?', [$request->email])",
        alternative: "Migrate to Eloquent ORM: User::where('email', $request->email)->first()"
      },
      cve_references: [],
      reasoning_trace: ["Found DB::select() call on line 42", "Traced $request->email directly into query string", "No sanitization or binding found in scope", "Confirmed as exploitable SQL injection"]
    },
    {
      id: "2", type: "hardcoded_secret", severity: "critical", cvss_score: 8.8,
      file: "config/services.php", line: 17,
      description: "Live AWS secret access key hardcoded directly in config file. This key is exposed to anyone with repository access and may grant full S3 bucket access.",
      consensus: "confirmed", confidence_score: 0.95, confirmed_by: ["claude", "gemini"],
      fix_suggestions: {
        primary: "Move to environment variable: 'secret' => env('AWS_SECRET_ACCESS_KEY')",
        alternative: "Use AWS IAM roles with instance profiles to eliminate key storage entirely"
      },
      cve_references: [],
      reasoning_trace: ["Pattern matched AKIA* prefix on line 17", "Cross-referenced with known AWS key format", "Key found in tracked config file, not .env"]
    },
    {
      id: "3", type: "xss", severity: "critical", cvss_score: 8.2,
      file: "resources/views/profile.blade.php", line: 89,
      description: "User-supplied username rendered directly with {!! !!} (unescaped output) in Blade template. Enables stored XSS allowing script injection for all profile viewers.",
      consensus: "confirmed", confidence_score: 0.95, confirmed_by: ["claude", "gemini"],
      fix_suggestions: {
        primary: "Replace {!! $user->name !!} with {{ $user->name }} to enable Blade auto-escaping",
        alternative: "Add server-side sanitization using e() helper before storing to database"
      },
      cve_references: [],
      reasoning_trace: ["Located {!! !!} unescaped echo on line 89", "Traced $user->name back to unsanitized DB column", "No Content-Security-Policy header found in middleware"]
    },
    {
      id: "4", type: "broken_auth", severity: "high", cvss_score: 7.5,
      file: "app/Http/Middleware/AdminCheck.php", line: 23,
      description: "Admin middleware checks a cookie value client-side rather than server-side session. Cookie can be forged to gain administrative access without credentials.",
      consensus: "confirmed", confidence_score: 0.95, confirmed_by: ["claude", "gemini"],
      fix_suggestions: { primary: "Validate admin status against server-side session or database role, not cookie value", alternative: null },
      cve_references: [],
      reasoning_trace: ["Middleware reads $_COOKIE['is_admin']", "No server-side session cross-check found", "Cookie is not HttpOnly or signed"]
    },
    {
      id: "5", type: "insecure_dependency", severity: "high", cvss_score: 7.1,
      file: "package.json", line: 12,
      description: "lodash@4.17.15 has a known prototype pollution vulnerability allowing attackers to modify Object.prototype properties, potentially leading to code execution.",
      consensus: "confirmed", confidence_score: 0.95, confirmed_by: ["claude", "gemini"],
      fix_suggestions: { primary: "Upgrade to lodash@4.17.21 or later: npm update lodash", alternative: "Replace lodash with native ES2023 array/object methods where possible" },
      cve_references: ["CVE-2021-23337", "CVE-2020-8203"],
      reasoning_trace: ["Found lodash 4.17.15 in package.json", "Queried OSV database", "Two active CVEs confirmed for this version"]
    },
    {
      id: "6", type: "path_traversal", severity: "high", cvss_score: 6.8,
      file: "app/Http/Controllers/FileController.php", line: 67,
      description: "File download endpoint uses user-supplied filename without sanitization. Attacker can request ../../.env to read sensitive environment files from the server.",
      consensus: "claude_only", confidence_score: 0.65, confirmed_by: ["claude"],
      fix_suggestions: { primary: "Use basename() to strip directory components: Storage::download(basename($request->filename))", alternative: null },
      cve_references: [],
      reasoning_trace: ["$request->filename passed directly to Storage::download()", "No basename() or realpath() check found", "Path traversal sequences not filtered"]
    },
    {
      id: "7", type: "idor", severity: "medium", cvss_score: 5.4,
      file: "app/Http/Controllers/OrderController.php", line: 34,
      description: "Order detail endpoint fetches order by ID from query parameter without checking ownership. Any authenticated user can view any other user's order.",
      consensus: "confirmed", confidence_score: 0.95, confirmed_by: ["claude", "gemini"],
      fix_suggestions: { primary: "Add ownership check: Order::where('id', $id)->where('user_id', auth()->id())->firstOrFail()", alternative: null },
      cve_references: [],
      reasoning_trace: ["Order::find($request->id) called without auth constraint", "Route accessible to any authenticated user", "No policy or gate check found"]
    },
    {
      id: "8", type: "misconfigured_permissions", severity: "low", cvss_score: 3.1,
      file: "storage/logs/laravel.log", line: null,
      description: "Application log file is world-readable (chmod 644). Logs may contain stack traces, database queries, and user data that aid in further attacks.",
      consensus: "gemini_only", confidence_score: 0.65, confirmed_by: ["gemini"],
      fix_suggestions: { primary: "Set log file permissions to 640 and ensure web server user is in the correct group", alternative: null },
      cve_references: [],
      reasoning_trace: ["File permission 644 detected on log file", "Log file accessible without authentication"]
    },
  ]
};

const STAGES = [
  { id: 1, icon: "⬡", label: "Ingesting repository files...",         engine: null },
  { id: 2, icon: "◈", label: "Claude: deep agentic analysis...",      engine: "claude" },
  { id: 3, icon: "◇", label: "Gemini: independent validation...",     engine: "gemini" },
  { id: 4, icon: "⬟", label: "Cross-referencing findings...",         engine: null },
  { id: 5, icon: "⬠", label: "Enriching with CVE data...",            engine: null },
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #060608;
    --surface: #0d0d12;
    --border: rgba(255,255,255,0.07);
    --text: #e8e8f0;
    --muted: #666680;
    --accent: #00e5ff;
    --accent2: #a78bfa;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }

  .app {
    min-height: 100vh;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse 60% 40% at 50% -10%, rgba(0,229,255,0.06) 0%, transparent 70%),
      radial-gradient(ellipse 40% 30% at 90% 80%, rgba(167,139,250,0.04) 0%, transparent 60%);
  }

  /* ── Nav ── */
  .nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 48px;
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 50;
    background: rgba(6,6,8,0.85);
    backdrop-filter: blur(12px);
  }
  .nav-logo { display: flex; align-items: center; gap: 10px; }
  .nav-icon {
    width: 32px; height: 32px; background: var(--accent);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .nav-name { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
  .nav-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: var(--muted);
    border: 1px solid var(--border);
    padding: 3px 8px; border-radius: 4px;
  }

  /* ── Hero ── */
  .hero {
    max-width: 760px; margin: 0 auto;
    padding: 96px 24px 64px;
    text-align: center;
  }
  .hero-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; letter-spacing: 0.15em;
    color: var(--accent); text-transform: uppercase;
    margin-bottom: 20px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .hero-eyebrow::before, .hero-eyebrow::after {
    content: ''; display: block;
    width: 32px; height: 1px; background: var(--accent); opacity: 0.4;
  }
  .hero-title {
    font-size: clamp(40px, 6vw, 68px);
    font-weight: 800; line-height: 1.0;
    letter-spacing: -0.04em; color: #fff;
    margin-bottom: 20px;
  }
  .hero-title span { color: var(--accent); }
  .hero-sub {
    font-size: 16px; color: var(--muted); line-height: 1.6;
    max-width: 540px; margin: 0 auto 48px;
    font-weight: 400;
  }

  /* ── Input box ── */
  .input-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 6px 6px 6px 20px;
    display: flex; align-items: center; gap: 12px;
    transition: border-color 0.2s;
    position: relative;
  }
  .input-card:focus-within { border-color: rgba(0,229,255,0.35); }
  .input-card input {
    flex: 1; background: transparent; border: none; outline: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; color: var(--text);
    padding: 10px 0;
  }
  .input-card input::placeholder { color: var(--muted); }
  .btn-submit {
    background: var(--accent); color: #000;
    border: none; cursor: pointer;
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 13px;
    padding: 12px 24px; border-radius: 10px;
    white-space: nowrap;
    transition: opacity 0.15s, transform 0.15s;
    flex-shrink: 0;
  }
  .btn-submit:hover { opacity: 0.88; transform: translateY(-1px); }
  .btn-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .input-hint {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--muted);
    margin-top: 10px; text-align: left;
  }

  /* ── Demo trigger ── */
  .demo-btn {
    margin-top: 20px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    font-family: 'Syne', sans-serif;
    font-size: 12px; font-weight: 600;
    padding: 8px 20px; border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .demo-btn:hover { border-color: var(--accent2); color: var(--accent2); }

  /* ── Loading ── */
  .loading-wrap {
    max-width: 520px; margin: 0 auto;
    padding: 48px 24px;
  }
  .loading-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 36px;
  }
  .spinner {
    width: 20px; height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-label { font-size: 13px; color: var(--muted); font-weight: 600; }
  .loading-repo {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; color: var(--accent);
    overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stages { display: flex; flex-direction: column; gap: 4px; }
  .stage {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 16px; border-radius: 10px;
    transition: background 0.3s;
  }
  .stage.active { background: rgba(0,229,255,0.05); }
  .stage.done   { opacity: 0.45; }
  .stage.pending { opacity: 0.2; }
  .stage-icon {
    font-size: 16px; width: 24px; text-align: center; flex-shrink: 0;
  }
  .stage.active  .stage-icon { color: var(--accent); }
  .stage.done    .stage-icon { color: #4caf50; }
  .stage.pending .stage-icon { color: var(--muted); }
  .stage-text { font-size: 13px; color: var(--text); }
  .stage.active  .stage-text { color: #fff; }
  .stage-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); margin-left: auto;
    animation: pulse 1s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.7); }
  }

  /* ── Report ── */
  .report-wrap { max-width: 900px; margin: 0 auto; padding: 48px 24px 80px; }

  .report-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 36px; gap: 16px;
    flex-wrap: wrap;
  }
  .report-title-row { display: flex; align-items: center; gap: 12px; }
  .report-repo-name { font-size: 24px; font-weight: 800; color: #fff; }
  .report-repo-url {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--muted);
    display: flex; align-items: center; gap: 6px;
    margin-top: 4px;
  }

  .btn-new {
    background: transparent; border: 1px solid var(--border);
    color: var(--muted); font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 12px;
    padding: 8px 18px; border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
    flex-shrink: 0;
  }
  .btn-new:hover { border-color: var(--accent); color: var(--accent); }

  /* ── Stats bar ── */
  .stats-bar {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px; margin-bottom: 36px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 16px;
    position: relative; overflow: hidden;
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 2px;
  }
  .stat-card.stat-critical::before { background: #ff3b3b; }
  .stat-card.stat-high::before     { background: #ff8c00; }
  .stat-card.stat-medium::before   { background: #f5c518; }
  .stat-card.stat-low::before      { background: #4caf50; }
  .stat-card.stat-confirmed::before{ background: var(--accent); }
  .stat-card.stat-total::before    { background: var(--accent2); }
  .stat-number { font-size: 32px; font-weight: 800; line-height: 1; }
  .stat-card.stat-critical .stat-number { color: #ff3b3b; }
  .stat-card.stat-high     .stat-number { color: #ff8c00; }
  .stat-card.stat-medium   .stat-number { color: #f5c518; }
  .stat-card.stat-low      .stat-number { color: #4caf50; }
  .stat-card.stat-confirmed .stat-number { color: var(--accent); }
  .stat-card.stat-total    .stat-number { color: var(--accent2); }
  .stat-label { font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.08em; }

  /* ── Engine badge row ── */
  .engine-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 28px; flex-wrap: wrap;
  }
  .engine-badge {
    display: flex; align-items: center; gap: 7px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 6px 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--muted);
  }
  .engine-dot { width: 6px; height: 6px; border-radius: 50%; }

  /* ── Findings list ── */
  .section-title {
    font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .section-title::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }

  .finding-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px; margin-bottom: 10px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .finding-card:hover { border-color: rgba(255,255,255,0.14); }

  .finding-header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 20px; cursor: pointer;
    user-select: none;
  }
  .sev-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; font-weight: 500; letter-spacing: 0.1em;
    padding: 3px 8px; border-radius: 4px;
    flex-shrink: 0; text-transform: uppercase;
  }
  .finding-type {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; color: #fff; font-weight: 500;
  }
  .finding-file {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    flex: 1; min-width: 0;
  }
  .consensus-badge {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 600; flex-shrink: 0;
    font-family: 'JetBrains Mono', monospace;
  }
  .cvss-score {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; font-weight: 500; flex-shrink: 0;
    margin-left: auto;
  }
  .chevron {
    font-size: 10px; color: var(--muted); flex-shrink: 0;
    transition: transform 0.2s;
  }
  .chevron.open { transform: rotate(90deg); }

  .finding-body {
    padding: 0 20px 20px;
    border-top: 1px solid var(--border);
  }
  .finding-desc {
    font-size: 13px; color: rgba(232,232,240,0.8); line-height: 1.65;
    padding: 16px 0 14px;
  }
  .finding-section-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
  }
  .fix-box {
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 12px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--text);
    line-height: 1.6; margin-bottom: 10px;
    white-space: pre-wrap; word-break: break-word;
  }
  .trace-list {
    list-style: none;
    display: flex; flex-direction: column; gap: 4px;
  }
  .trace-item {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--muted); line-height: 1.5;
    display: flex; gap: 8px;
  }
  .trace-item::before { content: '→'; color: var(--accent); flex-shrink: 0; }
  .cve-tag {
    display: inline-flex;
    background: rgba(255,60,60,0.1); border: 1px solid rgba(255,60,60,0.25);
    color: #ff7070; font-family: 'JetBrains Mono', monospace;
    font-size: 10px; padding: 3px 8px; border-radius: 4px;
    margin-right: 6px; margin-top: 4px;
  }
  .confidence-bar {
    display: flex; align-items: center; gap: 10px; margin-top: 14px;
  }
  .conf-label { font-size: 9px; color: var(--muted); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .conf-track {
    flex: 1; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden;
  }
  .conf-fill { height: 100%; border-radius: 2px; background: var(--accent); }
  .conf-value { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); }
`;

// ─── Components ───────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-logo">
        <div className="nav-icon" />
        <span className="nav-name">AuditHawk</span>
      </div>
      <span className="nav-tag">v1.0 · dual-AI</span>
    </nav>
  );
}

function InputScreen({ onSubmit, onDemo }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!url.trim()) return;
    setLoading(true);
    onSubmit(url.trim());
  };

  return (
    <div className="hero">
      <div className="hero-eyebrow">Autonomous Security Audit Agent</div>
      <h1 className="hero-title">
        Find vulnerabilities<br /><span>before attackers do</span>
      </h1>
      <p className="hero-sub">
        Submit a GitHub repository. Claude independently audits your codebase
        and cross-reference their findings for verified, high-confidence results.
      </p>

      <div className="input-card">
        <input
          type="text"
          placeholder="https://github.com/owner/repository"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          disabled={loading}
        />
        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={loading || !url.trim()}
        >
          {loading ? "Starting…" : "Audit →"}
        </button>
      </div>
      <div className="input-hint">Paste a public GitHub repo URL to begin</div>

      <div style={{ marginTop: 24 }}>
        <button className="demo-btn" onClick={onDemo}>
          ← Preview with demo report
        </button>
      </div>
    </div>
  );
}

function LoadingScreen({ repoUrl }) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timings = [1800, 4000, 7000, 9500, 11500];
    const timers = timings.map((delay, i) =>
      setTimeout(() => setActiveStage(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="loading-wrap">
      <div className="loading-header">
        <div className="spinner" />
        <div>
          <div className="loading-label">Audit in progress</div>
          <div className="loading-repo">{repoUrl}</div>
        </div>
      </div>

      <div className="stages">
        {STAGES.map((stage, i) => {
          const state = i < activeStage ? "done" : i === activeStage ? "active" : "pending";
          return (
            <div key={stage.id} className={`stage ${state}`}>
              <span className="stage-icon">{stage.icon}</span>
              <span className="stage-text">{stage.label}</span>
              {state === "active" && <span className="stage-dot" />}
              {state === "done" && <span style={{ marginLeft: "auto", fontSize: 12, color: "#4caf50" }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FindingCard({ finding }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY[finding.severity] || SEVERITY.low;
  const con = CONSENSUS[finding.consensus] || CONSENSUS.claude_only;

  return (
    <div className="finding-card">
      <div className="finding-header" onClick={() => setOpen(o => !o)}>
        <span
          className="sev-pill"
          style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.color}33` }}
        >
          {sev.label}
        </span>
        <span className="finding-type">{finding.type.replace(/_/g, " ")}</span>
        <span className="finding-file">{finding.file}{finding.line ? `:${finding.line}` : ""}</span>
        <span className="consensus-badge" style={{ color: con.color }}>
          {con.icon} {finding.confirmed_by?.join(" + ")}
        </span>
        <span className="cvss-score" style={{ color: sev.color }}>{finding.cvss_score?.toFixed(1)}</span>
        <span className={`chevron ${open ? "open" : ""}`}>▶</span>
      </div>

      {open && (
        <div className="finding-body">
          <p className="finding-desc">{finding.description}</p>

          {finding.fix_suggestions?.primary && (
            <>
              <div className="finding-section-label">Primary Fix (Claude)</div>
              <div className="fix-box">{finding.fix_suggestions.primary}</div>
            </>
          )}
          {finding.fix_suggestions?.alternative && (
            <>
              <div className="finding-section-label">Alternative Fix (Gemini)</div>
              <div className="fix-box">{finding.fix_suggestions.alternative}</div>
            </>
          )}

          {finding.reasoning_trace?.length > 0 && (
            <>
              <div className="finding-section-label" style={{ marginTop: 14 }}>Reasoning Trace</div>
              <ul className="trace-list">
                {finding.reasoning_trace.map((t, i) => (
                  <li key={i} className="trace-item">{t}</li>
                ))}
              </ul>
            </>
          )}

          {finding.cve_references?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {finding.cve_references.map(cve => (
                <span key={cve} className="cve-tag">{cve}</span>
              ))}
            </div>
          )}

          <div className="confidence-bar">
            <span className="conf-label">Confidence</span>
            <div className="conf-track">
              <div className="conf-fill" style={{ width: `${finding.confidence_score * 100}%` }} />
            </div>
            <span className="conf-value">{Math.round(finding.confidence_score * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportScreen({ report, onNew }) {
  const { summary, meta, findings, repo_name, repo_url } = report;
  const confirmedCount = findings.filter(f => f.consensus === "confirmed").length;
  const claudeOnlyCount = findings.filter(f => f.consensus === "claude_only").length;
  const geminiOnlyCount = findings.filter(f => f.consensus === "gemini_only").length;

  return (
    <div className="report-wrap">
      <div className="report-header">
        <div>
          <div className="report-title-row">
            <div className="report-repo-name">{repo_name}</div>
          </div>
          <div className="report-repo-url">
            <span>⬡</span>
            <span>{repo_url || "Uploaded codebase"}</span>
          </div>
        </div>
        <button className="btn-new" onClick={onNew}>← New Audit</button>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card stat-total">
          <div className="stat-number">{summary.total}</div>
          <div className="stat-label">Total Findings</div>
        </div>
        <div className="stat-card stat-confirmed">
          <div className="stat-number">{confirmedCount}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card stat-critical">
          <div className="stat-number">{summary.critical}</div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-card stat-high">
          <div className="stat-number">{summary.high}</div>
          <div className="stat-label">High</div>
        </div>
        <div className="stat-card stat-medium">
          <div className="stat-number">{summary.medium}</div>
          <div className="stat-label">Medium</div>
        </div>
        <div className="stat-card stat-low">
          <div className="stat-number">{summary.low}</div>
          <div className="stat-label">Low</div>
        </div>
      </div>

      {/* Engine info */}
      <div className="engine-row">
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Engines
        </span>
        {meta.engines_used.map((e, i) => (
          <div key={e} className="engine-badge">
            <div className="engine-dot" style={{ background: i === 0 ? "#a78bfa" : "#34d399" }} />
            {e}
          </div>
        ))}
        <div className="engine-badge" style={{ marginLeft: "auto" }}>
          {meta.files_scanned} files scanned
        </div>
        <div className="engine-badge">
          {meta.claude_count} + {meta.gemini_count} raw findings
        </div>
      </div>

      {/* Consensus legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { key: "confirmed",   count: confirmedCount,   label: "Confirmed by both" },
          { key: "claude_only", count: claudeOnlyCount,  label: "Claude only" },
          { key: "gemini_only", count: geminiOnlyCount,  label: "Gemini only" },
        ].map(({ key, count, label }) => {
          const c = CONSENSUS[key];
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
              <span style={{ color: c.color, fontSize: 14 }}>{c.icon}</span>
              <span style={{ color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
              <span style={{ color: "var(--muted)" }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Findings */}
      <div className="section-title">
        Security Findings — sorted by severity
      </div>
      {findings.map(f => <FindingCard key={f.id} finding={f} />)}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("input"); // input | loading | report
  const [repoUrl, setRepoUrl] = useState("");
  const [report, setReport] = useState(null);

  const handleSubmit = (url) => {
    setRepoUrl(url);
    setScreen("loading");

    // In production: POST to /api/audits, then poll GET /api/audits/{id}
    // For demo, simulate a 13-second audit then show mock report
    setTimeout(() => {
      setReport({ ...MOCK_REPORT, repo_url: url, repo_name: url.split("/").pop() || "repository" });
      setScreen("report");
    }, 13000);
  };

  const handleDemo = () => {
    setReport(MOCK_REPORT);
    setScreen("report");
  };

  const handleNew = () => {
    setScreen("input");
    setReport(null);
    setRepoUrl("");
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <Nav />
        {screen === "input"   && <InputScreen onSubmit={handleSubmit} onDemo={handleDemo} />}
        {screen === "loading" && <LoadingScreen repoUrl={repoUrl} />}
        {screen === "report"  && <ReportScreen report={report} onNew={handleNew} />}
      </div>
    </>
  );
}
