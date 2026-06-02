interface Props {
    score?: number;
}

export default function ConfidenceBar({ score = 0 }: Props) {
    const pct = Math.round(score * 100);

    return (
        <div className="flex items-center gap-3 mt-4">
            <span className="font-mono text-[10px] font-bold text-[#666680] uppercase tracking-wider flex-shrink-0">
                Confidence
            </span>
            <div className="flex-1 h-1 bg-white/7 rounded-full overflow-hidden">
                <div
                    className="h-full bg-[#00e5ff] rounded-full"
                    style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
                />
            </div>
            <span className="font-mono text-xs text-[#666680] flex-shrink-0">{pct}%</span>
        </div>
    );
}
