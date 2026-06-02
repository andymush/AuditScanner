import { useState } from 'react';
import ConfidenceBar from './ConfidenceBar';
import { SEVERITY, CONSENSUS } from '@/constants/audit';
import type { AuditFinding } from '@/types/audit';

interface Props {
    finding: AuditFinding;
}

function CardLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={`font-mono text-[10px] font-bold text-[#666680] uppercase tracking-wider mb-2 ${className}`}>
            {children}
        </p>
    );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
    return (
        <pre className="bg-black/30 border border-white/7 rounded-lg px-4 py-3 font-mono text-xs text-[#e8e8f0] leading-relaxed whitespace-pre-wrap break-words mb-3">
            {children}
        </pre>
    );
}

export default function FindingCard({ finding }: Props) {
    const [open, setOpen] = useState(false);
    const sev = SEVERITY[finding.severity] ?? SEVERITY.low;
    const con = CONSENSUS[finding.consensus] ?? CONSENSUS.claude_only;

    return (
        <article className="bg-[#0d0d12] border border-white/7 rounded-2xl overflow-hidden hover:border-white/[0.12] transition-colors">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
            >
                <span
                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0"
                    style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.color}33` }}
                >
                    {sev.label}
                </span>

                <span className="font-mono text-sm text-white font-medium flex-shrink-0">
                    {finding.type.replace(/_/g, ' ')}
                </span>

                <span className="font-mono text-xs text-[#666680] truncate flex-1 min-w-0">
                    {finding.file}{finding.line ? `:${finding.line}` : ''}
                </span>

                <span
                    className="flex items-center gap-1.5 font-mono text-xs flex-shrink-0"
                    style={{ color: con.color }}
                >
                    {con.icon} {finding.confirmed_by?.join(' + ')}
                </span>

                <span className="font-mono text-sm font-bold flex-shrink-0" style={{ color: sev.color }}>
                    {finding.cvss_score?.toFixed(1)}
                </span>

                <span
                    className={`text-[#666680] text-[10px] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                >
                    &#9654;
                </span>
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-white/7">
                    <p className="text-sm text-[#e8e8f0]/80 leading-relaxed py-4">
                        {finding.description}
                    </p>

                    {finding.fix_suggestions?.primary && (
                        <>
                            <CardLabel>Primary Fix</CardLabel>
                            <CodeBlock>{finding.fix_suggestions.primary}</CodeBlock>
                        </>
                    )}

                    {finding.fix_suggestions?.alternative && (
                        <>
                            <CardLabel>Alternative Fix</CardLabel>
                            <CodeBlock>{finding.fix_suggestions.alternative}</CodeBlock>
                        </>
                    )}

                    {finding.reasoning_trace?.length > 0 && (
                        <>
                            <CardLabel className="mt-4">Reasoning Trace</CardLabel>
                            <ul className="space-y-1 mb-3">
                                {finding.reasoning_trace.map((step, i) => (
                                    <li key={i} className="flex gap-2 font-mono text-xs text-[#666680]">
                                        <span className="text-[#00e5ff] flex-shrink-0">-&gt;</span>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {finding.cve_references?.length > 0 && (
                        <div className="flex flex-wrap gap-2 my-3">
                            {finding.cve_references.map((cve) => (
                                <span
                                    key={cve}
                                    className="font-mono text-xs px-2 py-0.5 rounded border text-red-300 bg-red-500/10 border-red-500/25"
                                >
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
