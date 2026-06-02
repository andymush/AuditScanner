import { useState, useEffect, useRef, useCallback } from 'react';
import { submitGithubAudit, submitFileAudit, getAudit } from '@/api/auditApi';
import { useSSEStream } from '@/hooks/useSSEStream';
import type { AuditReport, AuditFinding, AuditScreen } from '@/types/audit';

const POLL_INTERVAL_MS = 3000;

export function useAudit() {
    const [screen, setScreen]             = useState<AuditScreen>('input');
    const [auditId, setAuditId]           = useState<string | null>(null);
    const [report, setReport]             = useState<AuditReport | null>(null);
    const [submitError, setSubmitError]   = useState<string | null>(null);
    const [currentStage, setCurrentStage] = useState<number>(0);
    const [liveFindings, setLiveFindings] = useState<AuditFinding[]>([]);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useSSEStream(screen === 'loading' ? auditId : null, (payload) => {
        if (payload.type === 'stage' && payload.stage !== undefined) {
            setCurrentStage(payload.stage);
        }
        if (payload.type === 'finding' && payload.finding) {
            setLiveFindings((prev) => [...prev, payload.finding!]);
        }
    });

    const stopPolling = useCallback(() => {
        if (pollRef.current !== null) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPolling = useCallback(
        (id: string) => {
            pollRef.current = setInterval(async () => {
                try {
                    const data = await getAudit(id);
                    if (data.status === 'complete') {
                        stopPolling();
                        setReport(data);
                        setScreen('report');
                    }
                    if (data.status === 'failed') {
                        stopPolling();
                        setSubmitError(data.error ?? 'Audit failed. Please try again.');
                        setScreen('input');
                    }
                } catch {
                    // polling errors are non-fatal — next tick will retry
                }
            }, POLL_INTERVAL_MS);
        },
        [stopPolling],
    );

    useEffect(() => () => stopPolling(), [stopPolling]);

    const handleSubmitResult = useCallback(
        ({ audit_id }: { audit_id: string }) => {
            setAuditId(audit_id);
            setCurrentStage(0);
            setLiveFindings([]);
            setScreen('loading');
            startPolling(audit_id);
        },
        [startPolling],
    );

    const submitUrl = useCallback(
        async (url: string) => {
            setSubmitError(null);
            try {
                const result = await submitGithubAudit(url);
                handleSubmitResult(result);
            } catch {
                setSubmitError('Could not start audit. Check the URL and try again.');
            }
        },
        [handleSubmitResult],
    );

    const submitFile = useCallback(
        async (file: File) => {
            setSubmitError(null);
            try {
                const result = await submitFileAudit(file);
                handleSubmitResult(result);
            } catch {
                setSubmitError('Upload failed. Ensure the file is a .zip under 20 MB.');
            }
        },
        [handleSubmitResult],
    );

    const reset = useCallback(() => {
        stopPolling();
        setScreen('input');
        setAuditId(null);
        setReport(null);
        setSubmitError(null);
        setCurrentStage(0);
        setLiveFindings([]);
    }, [stopPolling]);

    return {
        screen,
        auditId,
        currentStage,
        liveFindings,
        report,
        submitError,
        submitUrl,
        submitFile,
        reset,
    };
}
