import { CONSENSUS } from '@/constants/audit';
import type { AuditFinding, AuditMeta, Consensus } from '@/types/audit';

interface Props {
    meta?: Partial<AuditMeta>;
    findings: AuditFinding[];
}

export default function EngineRow({ meta = {}, findings = [] }: Props) {
    const counts: Record<Consensus, number> = {
        confirmed:   findings.filter((f) => f.consensus === 'confirmed').length,
        claude_only: findings.filter((f) => f.consensus === 'claude_only').length,
        gemini_only: findings.filter((f) => f.consensus === 'gemini_only').length,
    };

    return (
        <div className="mb-7 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#666680] uppercase tracking-wider">
                    Engines
                </span>
                {(meta.engines_used ?? []).map((name, i) => (
                    <span
                        key={name}
                        className="flex items-center gap-2 bg-[#0d0d12] border border-white/7 rounded-lg px-3 py-1.5 font-mono text-xs text-[#666680]"
                    >
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: i === 0 ? '#a78bfa' : '#34d399' }}
                        />
                        {name}
                    </span>
                ))}
                {meta.files_scanned != null && (
                    <span className="ml-auto font-mono text-xs text-[#666680] bg-[#0d0d12] border border-white/7 rounded-lg px-3 py-1.5">
                        {meta.files_scanned} files scanned
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-5">
                {(Object.keys(counts) as Consensus[]).map((key) => {
                    const c = CONSENSUS[key];
                    return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                            <span style={{ color: c.color }}>{c.icon}</span>
                            <span className="font-mono font-semibold" style={{ color: c.color }}>
                                {counts[key]}
                            </span>
                            <span className="text-[#666680]">{c.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
