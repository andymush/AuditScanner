import { STAT_CARDS } from '@/constants/audit';
import type { AuditSummary } from '@/types/audit';

interface Props {
    summary?: Partial<AuditSummary>;
}

export default function SummaryStats({ summary = {} }: Props) {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
            {STAT_CARDS.map(({ key, label, color, border }) => (
                <div
                    key={key}
                    className="bg-[#0d0d12] border border-white/7 rounded-xl p-4 relative overflow-hidden"
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
