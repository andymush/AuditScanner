import { useState } from 'react';

interface Props {
    onSubmit: (url: string) => Promise<void>;
}

const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/;

function validateGitHubUrl(url: string): string | null {
    if (!url.trim()) return 'Please enter a GitHub repository URL.';
    if (!GITHUB_REPO_REGEX.test(url.trim())) {
        return 'URL must be a valid GitHub repository: https://github.com/owner/repository';
    }
    return null;
}

export default function UrlInput({ onSubmit }: Props) {
    const [url, setUrl]         = useState('');
    const [error, setError]     = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (value: string) => {
        setUrl(value);
        if (error) setError(validateGitHubUrl(value));
    };

    const handleSubmit = async () => {
        const validationError = validateGitHubUrl(url);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        setLoading(true);
        await onSubmit(url.trim());
        setLoading(false);
    };

    return (
        <>
            <div className={`flex items-center gap-2 bg-[#0d0d12] border rounded-2xl px-5 py-1 transition-colors ${
                error ? 'border-red-500/60' : 'border-white/7 focus-within:border-[#00e5ff]/40'
            }`}>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => handleChange(e.target.value)}
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
            {error ? (
                <p className="mt-2 text-left font-mono text-xs text-red-400">{error}</p>
            ) : (
                <p className="mt-2 text-left font-mono text-xs text-[#666680]">
                    Paste any public GitHub repository URL
                </p>
            )}
        </>
    );
}
