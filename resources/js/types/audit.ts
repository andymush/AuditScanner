export type AuditStatus = 'pending' | 'running' | 'complete' | 'failed';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Consensus = 'confirmed' | 'claude_only' | 'gemini_only';
export type AuditScreen = 'input' | 'loading' | 'report';

export interface FixSuggestions {
    primary: string | null;
    alternative: string | null;
}

export interface AuditFinding {
    id: string;
    type: string;
    severity: Severity;
    cvss_score: number;
    file: string | null;
    line: number | null;
    description: string;
    consensus: Consensus;
    confidence_score: number;
    confirmed_by: string[];
    fix_suggestions: FixSuggestions;
    cve_references: string[];
    reasoning_trace: string[];
}

export interface AuditMeta {
    engines_used: string[];
    files_scanned: number;
    claude_count: number;
    gemini_count: number;
    confirmed_count: number;
    claude_only: number;
    gemini_only: number;
    total_findings: number;
    severity_counts: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}

export interface AuditSummary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    confirmed: number;
}

export interface AuditReport {
    audit_id: string;
    status: AuditStatus;
    repo_name: string | null;
    repo_url: string | null;
    source_type: string;
    started_at: string | null;
    completed_at: string | null;
    error: string | null;
    meta: AuditMeta;
    summary: AuditSummary;
    findings: AuditFinding[];
}

export interface SSEPayload {
    type: 'connected' | 'stage' | 'finding' | 'focus' | 'status' | 'done' | 'error';
    audit_id?: string;
    message?: string;
    stage?: number;
    engine?: string;
    finding?: AuditFinding;
    file?: string;
    reason?: string;
    status?: string;
}
