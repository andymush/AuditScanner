import type { Severity, Consensus } from '@/types/audit';

export const SEVERITY: Record<Severity, { color: string; bg: string; label: string; order: number }> = {
    critical: { color: '#ff3b3b', bg: '#1a0505', label: 'CRITICAL', order: 0 },
    high:     { color: '#ff8c00', bg: '#1a0e00', label: 'HIGH',     order: 1 },
    medium:   { color: '#f5c518', bg: '#1a1600', label: 'MEDIUM',   order: 2 },
    low:      { color: '#4caf50', bg: '#051a05', label: 'LOW',      order: 3 },
};

export const CONSENSUS: Record<Consensus, { icon: string; label: string; color: string }> = {
    confirmed:   { icon: '⬡', label: 'Confirmed by both AIs', color: '#00e5ff' },
    claude_only: { icon: '◈', label: 'Claude only',           color: '#a78bfa' },
    gemini_only: { icon: '◇', label: 'Gemini only',           color: '#34d399' },
};

export const STAGES = [
    { id: 1, label: 'Ingesting repository files...'     },
    { id: 2, label: 'Claude: deep agentic analysis...'  },
    { id: 3, label: 'Gemini: independent validation...' },
    { id: 4, label: 'Cross-referencing findings...'     },
    { id: 5, label: 'Enriching with CVE data...'        },
] as const;

export const STAT_CARDS: { key: keyof import('@/types/audit').AuditSummary; label: string; color: string; border: string }[] = [
    { key: 'total',     label: 'Total',     color: '#a78bfa', border: '#a78bfa' },
    { key: 'confirmed', label: 'Confirmed', color: '#00e5ff', border: '#00e5ff' },
    { key: 'critical',  label: 'Critical',  color: '#ff3b3b', border: '#ff3b3b' },
    { key: 'high',      label: 'High',      color: '#ff8c00', border: '#ff8c00' },
    { key: 'medium',    label: 'Medium',    color: '#f5c518', border: '#f5c518' },
    { key: 'low',       label: 'Low',       color: '#4caf50', border: '#4caf50' },
];
