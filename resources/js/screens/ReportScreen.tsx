import SummaryStats from '@/components/report/SummaryStats';
import EngineRow from '@/components/report/EngineRow';
import FindingCard from '@/components/report/FindingCard';
import { sortFindings } from '@/utils/auditFormatters';
import type { AuditReport } from '@/types/audit';

interface Props {
    report: AuditReport;
    onReset: () => void;
}

export default function ReportScreen({ report, onReset }: Props) {
    const { summary, meta, findings = [], repo_name, repo_url } = report;
    const sorted = sortFindings(findings);

    return (
        <main className="max-w-4xl mx-auto px-6 py-12 pb-24">
            <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
                <div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">
                        {repo_name}
                    </h2>
                    {repo_url && (
                        <a
                            href={repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-[#666680] hover:text-[#00e5ff] transition-colors mt-1 inline-flex items-center gap-1"
                        >
                            {repo_url}
                        </a>
                    )}
                </div>
                <button
                    onClick={onReset}
                    className="border border-white/7 text-[#666680] text-xs font-bold px-4 py-2 rounded-lg hover:border-[#00e5ff] hover:text-[#00e5ff] transition-all flex-shrink-0"
                >
                    New Audit
                </button>
            </div>

            <SummaryStats summary={summary} />
            <EngineRow meta={meta} findings={sorted} />

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
                    {sorted.map((f) => (
                        <FindingCard key={f.id} finding={f} />
                    ))}
                </div>
            )}
        </main>
    );
}
