import { useState } from 'react';

interface Props {
    onSubmit: (url: string) => Promise<void>;
}

export default function UrlInput({ onSubmit }: Props) {
    const [url, setUrl]         = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!url.trim()) return;
        setLoading(true);
        await onSubmit(url.trim());
        setLoading(false);
    };

    return (
        <>
            <div className="flex items-center gap-2 bg-[#0d0d12] border border-white/7 rounded-2xl px-5 py-1 focus-within:border-[#00e5ff]/40 transition-colors">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="https://github.com/owner/repository"
                    disabled={loading}
                    className="flex-1 bg-transparent outline-none font-mono text-sm text-[#e8e8f0] placeholder-[#666680] py-3"
                />
                <button
                    onClick={handleSubmit}
                    disabled={loading || !url.trim()}
                    className="flex-shrink-0 bg-[#00e5ff] text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:opacity-85 hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {loading ? 'Starting...' : 'Audit'}
                </button>
            </div>
            <p className="mt-2 text-left font-mono text-xs text-[#666680]">
                Paste any public GitHub repository URL
            </p>
        </>
    );
}
