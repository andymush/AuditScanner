import type { AuditReport } from '@/types/audit';

const BASE = (import.meta as ImportMeta & { env: Record<string, string> }).env?.VITE_API_BASE_URL ?? '/api';

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
}

export interface SubmitResult {
    audit_id: string;
    status: string;
    message: string;
}

export async function submitGithubAudit(repoUrl: string): Promise<SubmitResult> {
    return handleResponse<SubmitResult>(
        await fetch(`${BASE}/audits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_type: 'github_url', repo_url: repoUrl }),
        }),
    );
}

export async function submitFileAudit(file: File): Promise<SubmitResult> {
    const form = new FormData();
    form.append('source_type', 'file_upload');
    form.append('file', file);
    // Do not set Content-Type — browser sets it with the correct multipart boundary
    return handleResponse<SubmitResult>(await fetch(`${BASE}/audits`, { method: 'POST', body: form }));
}

export async function getAudit(auditId: string): Promise<AuditReport> {
    return handleResponse<AuditReport>(await fetch(`${BASE}/audits/${auditId}`));
}

export async function listAudits(): Promise<AuditReport[]> {
    return handleResponse<AuditReport[]>(await fetch(`${BASE}/audits`));
}

export function openAuditStream(auditId: string): EventSource {
    return new EventSource(`${BASE}/audits/${auditId}/stream`);
}
