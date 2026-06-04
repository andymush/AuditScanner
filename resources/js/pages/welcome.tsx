import { Head, Link, usePage } from '@inertiajs/react';
import { login, register, audit } from '@/routes';

const FINDING_TYPES = [
    'SQL Injection', 'XSS', 'Hardcoded Secret', 'Broken Auth',
    'Path Traversal', 'SSRF', 'IDOR', 'RCE',
    'Insecure Dependency', 'Misconfigured Permissions',
];

const FEATURES = [
    {
        accent: '#00e5ff',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
        ),
        title: 'Dual-AI Cross-Validation',
        description: 'Claude scan your codebase independently. Findings confirmed by both engines get a 0.95 confidence score — single-engine detections are flagged separately.',
    },
    {
        accent: '#a78bfa',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
        ),
        title: 'GitHub URL or Zip Upload',
        description: 'Paste a public GitHub repo URL or upload a zip archive. We ingest up to 50 files, normalise the tree, and feed only auditable code to the AI engines.',
    },
    {
        accent: '#f5c518',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        ),
        title: 'CVE Enrichment',
        description: 'Insecure dependency findings are automatically enriched via the OSV API — real CVE IDs, CVSS scores, and fix versions, cached for 24 hours.',
    },
    {
        accent: '#4caf50',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        ),
        title: 'Live Streaming Results',
        description: 'Watch findings appear in real time as Claude agentic loop runs. No waiting for a full scan to finish — critical vulnerabilities surface immediately.',
    },
];

const STEPS = [
    { number: '01', label: 'Submit', detail: 'Paste a GitHub URL or upload a zip archive' },
    { number: '02', label: 'Ingest', detail: 'We extract and normalise your codebase (max 50 files)' },
    { number: '03', label: 'Scan', detail: 'Claude runs independent security analyses' },
    { number: '04', label: 'Report', detail: 'Reconciled findings with CVSS scores and fix suggestions' },
];

export default function Welcome() {
    const { auth } = usePage<{ auth: { user: { name: string } | null } }>().props;

    return (
        <>
            <Head title="AuditHawk — AI-Powered Security Auditor" />
            <div
                className="min-h-screen bg-[#060608] text-[#e8e8f0]"
                style={{
                    backgroundImage: [
                        'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(0,229,255,0.07) 0%, transparent 70%)',
                        'radial-gradient(ellipse 40% 30% at 90% 80%, rgba(167,139,250,0.05) 0%, transparent 60%)',
                    ].join(', '),
                }}
            >
                {/* ── Nav ── */}
                <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/7 bg-[#060608]/85 backdrop-blur-xl md:px-12">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 bg-[#00e5ff] flex-shrink-0"
                            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                        />
                        <span className="text-lg font-extrabold tracking-tight text-white">AuditHawk</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {auth.user ? (
                            <Link
                                href={audit()}
                                className="inline-flex items-center gap-2 rounded-md bg-[#00e5ff] px-5 py-2 text-sm font-semibold text-[#060608] transition-opacity hover:opacity-90 cursor-pointer"
                            >
                                Go to App
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="font-mono text-sm text-[#666680] hover:text-white transition-colors cursor-pointer"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={register()}
                                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                {/* ── Hero ── */}
                <section className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center md:pt-32 md:pb-28">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/5 px-4 py-1.5 text-xs font-mono text-[#00e5ff] mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                        Claude · Real-time
                    </div>

                    <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight md:text-6xl lg:text-7xl">
                        Find security flaws
                        <br />
                        <span className="text-[#00e5ff]">before attackers do.</span>
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg text-[#666680] leading-relaxed">
                        AuditHawk submits your codebase to Claude — then reconciles its findings into a single ranked security report with CVE enrichment and fix suggestions.
                    </p>

                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href={auth.user ? audit() : register()}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#00e5ff] px-8 py-3.5 text-base font-bold text-[#060608] shadow-[0_0_32px_rgba(0,229,255,0.25)] hover:shadow-[0_0_48px_rgba(0,229,255,0.4)] transition-shadow cursor-pointer"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            {auth.user ? 'Open App' : 'Audit Your Codebase — Free'}
                        </Link>
                        <Link
                            href={login()}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-8 py-3.5 text-base font-semibold text-[#e8e8f0] hover:border-white/20 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            Log in
                        </Link>
                    </div>

                    {/* Confidence pill strip */}
                    <div className="mt-12 flex flex-wrap justify-center gap-3">
                        {[
                            { label: 'confirmed', color: '#00e5ff', score: '0.95' },
                            { label: 'claude only', color: '#a78bfa', score: '0.65' },
                            //{ label: 'gemini only', color: '#a78bfa', score: '0.65' },
                        ].map((c) => (
                            <span
                                key={c.label}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono"
                                style={{ borderColor: `${c.color}30`, color: c.color, background: `${c.color}08` }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                                {c.label} · {c.score} confidence
                            </span>
                        ))}
                    </div>
                </section>

                {/* ── How it works ── */}
                <section className="border-y border-white/7 bg-[#0d0d12] py-20 px-6">
                    <div className="mx-auto max-w-5xl">
                        <p className="text-center font-mono text-xs text-[#666680] uppercase tracking-widest mb-12">How it works</p>
                        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                            {STEPS.map((step, i) => (
                                <div key={step.number} className="relative flex flex-col gap-3">
                                    {i < STEPS.length - 1 && (
                                        <div className="hidden md:block absolute top-5 left-[calc(50%+28px)] right-[-calc(50%-28px)] h-px bg-gradient-to-r from-white/10 to-transparent" />
                                    )}
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-2xl font-bold text-[#00e5ff]">{step.number}</span>
                                        <div className="h-px flex-1 bg-white/7 md:hidden" />
                                    </div>
                                    <p className="text-base font-semibold text-white">{step.label}</p>
                                    <p className="text-sm text-[#666680] leading-relaxed">{step.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Features ── */}
                <section className="mx-auto max-w-5xl px-6 py-24">
                    <p className="text-center font-mono text-xs text-[#666680] uppercase tracking-widest mb-4">Why AuditHawk</p>
                    <h2 className="text-center text-3xl font-extrabold text-white mb-14">Everything you need to ship secure code</h2>
                    <div className="grid gap-5 md:grid-cols-2">
                        {FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className="rounded-xl border border-white/7 bg-[#0d0d12] p-7 hover:border-white/12 transition-colors"
                            >
                                <div
                                    className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-lg"
                                    style={{ color: f.accent, background: `${f.accent}12`, border: `1px solid ${f.accent}20` }}
                                >
                                    {f.icon}
                                </div>
                                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-[#666680] leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Finding types ── */}
                <section className="border-t border-white/7 bg-[#0d0d12] py-20 px-6">
                    <div className="mx-auto max-w-5xl">
                        <p className="text-center font-mono text-xs text-[#666680] uppercase tracking-widest mb-4">Detection coverage</p>
                        <h2 className="text-center text-3xl font-extrabold text-white mb-10">10 vulnerability classes detected</h2>
                        <div className="flex flex-wrap justify-center gap-3">
                            {FINDING_TYPES.map((type) => (
                                <span
                                    key={type}
                                    className="rounded-full border border-white/10 bg-white/4 px-4 py-1.5 text-sm font-mono text-[#e8e8f0] hover:border-[#00e5ff]/30 hover:text-[#00e5ff] transition-colors cursor-default"
                                >
                                    {type}
                                </span>
                            ))}
                        </div>

                        {/* Severity strip */}
                        <div className="mt-12 flex flex-wrap justify-center gap-4">
                            {[
                                { label: 'Critical', color: '#ff3b3b' },
                                { label: 'High', color: '#ff8c00' },
                                { label: 'Medium', color: '#f5c518' },
                                { label: 'Low', color: '#4caf50' },
                            ].map((s) => (
                                <div key={s.label} className="flex items-center gap-2 text-sm">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                                    <span className="text-[#666680] font-mono">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="py-28 px-6 text-center">
                    <div className="mx-auto max-w-2xl">
                        <div
                            className="w-14 h-14 bg-[#00e5ff] mx-auto mb-8"
                            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                        />
                        <h2 className="text-4xl font-extrabold text-white mb-4">
                            Your code deserves a second opinion.
                        </h2>
                        <p className="text-lg text-[#666680] mb-10">
                            Paste a GitHub URL and get a full security report in minutes. No credit card, no setup.
                        </p>
                        <Link
                            href={auth.user ? audit() : register()}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#00e5ff] px-10 py-4 text-lg font-bold text-[#060608] shadow-[0_0_40px_rgba(0,229,255,0.3)] hover:shadow-[0_0_60px_rgba(0,229,255,0.45)] transition-shadow cursor-pointer"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Start Your Free Audit
                        </Link>
                    </div>
                </section>

                {/* ── Footer ── */}
                <footer className="border-t border-white/7 py-8 px-6">
                    <div className="mx-auto max-w-5xl flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-5 h-5 bg-[#00e5ff]"
                                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                            />
                            <span className="text-sm font-bold text-white">AuditHawk</span>
                        </div>
                        <p className="text-xs text-[#666680] font-mono">Claude · v1.0</p>
                        <div className="flex items-center gap-4 text-xs text-[#666680]">
                            <Link href={login()} className="hover:text-white transition-colors cursor-pointer">Log in</Link>
                            <Link href={register()} className="hover:text-white transition-colors cursor-pointer">Register</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}

Welcome.layout = null;
