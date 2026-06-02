export default function AuditNav() {
    return (
        <nav className="sticky top-0 z-50 flex items-center justify-between px-8 md:px-12 py-5 border-b border-white/7 bg-[#060608]/85 backdrop-blur-xl">
            <div className="flex items-center gap-3">
                <div
                    className="w-8 h-8 bg-[#00e5ff] flex-shrink-0"
                    style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                />
                <span className="text-lg font-extrabold tracking-tight text-white">AuditHawk</span>
            </div>
            <span className="font-mono text-xs text-[#666680] border border-white/7 px-3 py-1 rounded-md">
                dual-AI · v1.0
            </span>
        </nav>
    );
}
