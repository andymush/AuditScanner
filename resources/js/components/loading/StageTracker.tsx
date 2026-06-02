import type { STAGES } from '@/constants/audit';

interface Props {
    stages: typeof STAGES;
    activeIndex: number;
}

export default function StageTracker({ stages, activeIndex }: Props) {
    return (
        <div className="space-y-1">
            {stages.map((stage, i) => {
                const done    = i < activeIndex;
                const active  = i === activeIndex;
                const pending = i > activeIndex;

                return (
                    <div
                        key={stage.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            active  ? 'bg-[#00e5ff]/5' : ''
                        } ${pending ? 'opacity-20' : ''} ${done ? 'opacity-45' : ''}`}
                    >
                        <span
                            className={`font-mono text-xs font-bold w-5 text-center flex-shrink-0 ${
                                active ? 'text-[#00e5ff]' : done ? 'text-green-400' : 'text-[#666680]'
                            }`}
                        >
                            {stage.id}
                        </span>

                        <span className={`text-sm flex-1 ${active ? 'text-white font-semibold' : 'text-[#e8e8f0]'}`}>
                            {stage.label}
                        </span>

                        {active && (
                            <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse flex-shrink-0" />
                        )}
                        {done && (
                            <span className="font-mono text-xs text-green-400 flex-shrink-0">done</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
