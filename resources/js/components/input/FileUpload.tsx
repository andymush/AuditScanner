import { useState, useRef } from 'react';

interface Props {
    onSubmit: (file: File) => Promise<void>;
}

export default function FileUpload({ onSubmit }: Props) {
    const [file, setFile]       = useState<File | null>(null);
    const [over, setOver]       = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef              = useRef<HTMLInputElement>(null);

    const accept = (f: File | null | undefined) => {
        if (f?.name?.endsWith('.zip')) setFile(f);
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
                    over || file
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

            {file && (
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
