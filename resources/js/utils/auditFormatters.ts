import { SEVERITY } from '@/constants/audit';
import type { AuditFinding } from '@/types/audit';

export function cvssToColor(score: number): string {
    if (score >= 9.0) return SEVERITY.critical.color;
    if (score >= 7.0) return SEVERITY.high.color;
    if (score >= 4.0) return SEVERITY.medium.color;
    return SEVERITY.low.color;
}

export function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

export function sortFindings(findings: AuditFinding[]): AuditFinding[] {
    return [...findings].sort((a, b) => {
        const ao = SEVERITY[a.severity]?.order ?? 99;
        const bo = SEVERITY[b.severity]?.order ?? 99;
        if (ao !== bo) return ao - bo;
        return (b.cvss_score ?? 0) - (a.cvss_score ?? 0);
    });
}
