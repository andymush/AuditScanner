import { useState, useRef } from 'react';

interface Props {
    onSubmit: (file: File) => Promise<void>;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — matches backend max:20480

function validateZip(f: File): string | null {
    const validMimes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
    if (!f.name.toLowerCase().endsWith('.zip') && !validMimes.includes(f.type)) {
        return 'Only .zip files are accepted.';
    }
    if (!f.name.toLowerCase().endsWith('.zip')) {
        return 'Only .zip files are accepted.';
    }
    if (f.size > MAX_BYTES) {
        return `File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.`;
    }
    return null;
}

export default function FileUpload({ onSubmit }: Props) {
    const [file, setFile]       = useState<File | null>(null);
    const [error, setError]     = useState<string | null>(null);
    const [over, setOver]       = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef              = useRef<HTMLInputElement>(null);

    const accept = (f: File | null | undefined) => {
        if (!f) return;
        const validationError = validateZip(f);
        if (validationError) {
            setError(validationError);
            setFile(null);
            return;
        }
        setError(null);
        setFile(f);
    };

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);
        await onSubmit(file);
        setLoading(false);
    };

    return (
        <>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setOver(false);
                    accept(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer text-center transition-colors select-none ${
                    error
                        ? 'border-red-500/60 bg-red-500/5'
                        : over || file
                            ? 'border-[#00e5ff] bg-[#00e5ff]/5'
                            : 'border-white/7 hover:border-[#00e5ff]/40'
                }`}
            >
                <p className="text-sm font-semibold text-[#e8e8f0]">
                    {file ? file.name : 'Drop your zip here, or click to browse'}
                </p>
                <p className="font-mono text-xs text-[#666680] mt-1">.zip only — max 20 MB</p>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => accept(e.target.files?.[0])}
            />

            {error && (
                <p className="mt-2 text-left font-mono text-xs text-red-400">{error}</p>
            )}

            {file && !error && (
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-4 w-full bg-[#00e5ff] text-black font-bold text-sm py-3 rounded-xl transition-all hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? 'Uploading...' : `Audit ${file.name}`}
                </button>
            )}
        </>
    );
}
