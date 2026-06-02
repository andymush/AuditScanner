import StageTracker from '@/components/loading/StageTracker';
import LiveFindingFeed from '@/components/loading/LiveFindingFeed';
import { STAGES } from '@/constants/audit';
import type { AuditFinding } from '@/types/audit';

interface Props {
    auditId: string | null;
    currentStage: number;
    liveFindings: AuditFinding[];
}

export default function LoadingScreen({ auditId, currentStage, liveFindings }: Props) {
    return (
        <main className="max-w-lg mx-auto px-6 py-16">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#00e5ff] animate-spin flex-shrink-0" />
                <div className="min-w-0">
                    <p className="text-sm font-bold text-white">Audit in progress</p>
                    <p className="font-mono text-xs text-[#00e5ff] truncate">ID: {auditId}</p>
                </div>
            </div>

            <StageTracker stages={STAGES} activeIndex={currentStage} />

            {liveFindings.length > 0 && <LiveFindingFeed findings={liveFindings} />}

            <p className="font-mono text-xs text-[#666680] text-center mt-8">
                Audits typically complete in 1–3 minutes
            </p>
        </main>
    );
}
