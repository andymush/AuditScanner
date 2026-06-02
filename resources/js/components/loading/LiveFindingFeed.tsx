import { SEVERITY } from '@/constants/audit';
import type { AuditFinding } from '@/types/audit';

interface Props {
    findings: AuditFinding[];
}

export default function LiveFindingFeed({ findings }: Props) {
    const recent = findings.slice(-5);

    return (
        <div className="mt-8">
            <p className="font-mono text-xs text-[#666680] uppercase tracking-wider mb-3">
                Live findings — {findings.length} so far
            </p>
            <div className="space-y-2">
                {recent.map((f, i) => {
                    const sev = SEVERITY[f.severity] ?? SEVERITY.low;
                    return (
                        <div
                            key={i}
                            className="bg-[#0d0d12] border border-white/7 rounded-xl px-4 py-3 flex items-center gap-3"
                        >
                            <span
                                className="font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                                style={{ color: sev.color, background: sev.bg }}
                            >
                                {sev.label}
                            </span>
                            <span className="font-mono text-xs text-[#e8e8f0] flex-1 truncate">
                                {f.type.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-xs text-[#666680] truncate max-w-[8rem] flex-shrink-0">
                                {f.file?.split('/').pop()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
