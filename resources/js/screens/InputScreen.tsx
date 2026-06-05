import { useState } from 'react';
import UrlInput from '@/components/input/UrlInput';
import FileUpload from '@/components/input/FileUpload';

interface Props {
    onSubmitUrl: (url: string) => Promise<void>;
    onSubmitFile: (file: File) => Promise<void>;
    error: string | null;
}

const FEATURE_TAGS = ['Claude Sonnet',
    // 'Gemini Flash', 
    'CVSS Scoring', 'CVE Cross-Reference', 'Dual-Engine Confidence'];

export default function InputScreen({ onSubmitUrl, onSubmitFile, error }: Props) {
    const [mode, setMode] = useState<'url' | 'file'>('url');

    return (
        <main className="max-w-2xl mx-auto px-6 pt-24 pb-16 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
                <span className="block w-8 h-px bg-[#00e5ff] opacity-40" />
                <span className="font-mono text-xs tracking-widest text-[#00e5ff] uppercase">
                    Autonomous Security Audit Agent
                </span>
                <span className="block w-8 h-px bg-[#00e5ff] opacity-40" />
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tighter text-white mb-5">
                Find vulnerabilities
                <br />
                <span className="text-[#00e5ff]">before attackers do</span>
            </h1>

            <p className="text-[#666680] text-base leading-relaxed max-w-md mx-auto mb-10">
                Submit a GitHub repository or a zip file. Claude and Gemini independently audit your
                codebase and cross-reference findings for verified results.
            </p>

            <div className="flex justify-center gap-2 mb-6">
                {(['url', 'file'] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
                            mode === m
                                ? 'border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/10'
                                : 'border-white/7 text-[#666680] hover:border-[#00e5ff]/40'
                        }`}
                    >
                        {m === 'url' ? 'GitHub URL' : 'Upload ZIP'}
                    </button>
                ))}
            </div>

            {mode === 'url' ? (
                <UrlInput onSubmit={onSubmitUrl} />
            ) : (
                <FileUpload onSubmit={onSubmitFile} />
            )}

            {error && (
                <p className="mt-4 font-mono text-sm text-red-400">{error}</p>
            )}

            <div className="flex flex-wrap justify-center gap-3 mt-10">
                {FEATURE_TAGS.map((tag) => (
                    <span
                        key={tag}
                        className="font-mono text-xs text-[#666680] border border-white/7 px-3 py-1 rounded-full"
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </main>
    );
}
