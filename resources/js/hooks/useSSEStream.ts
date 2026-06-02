import { useEffect, useRef, useCallback } from 'react';
import { openAuditStream } from '@/api/auditApi';
import type { SSEPayload } from '@/types/audit';

export function useSSEStream(auditId: string | null, onEvent: (event: SSEPayload) => void): () => void {
    const esRef = useRef<EventSource | null>(null);
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    const close = useCallback(() => {
        esRef.current?.close();
        esRef.current = null;
    }, []);

    useEffect(() => {
        if (!auditId) return;

        const es = openAuditStream(auditId);
        esRef.current = es;

        es.onmessage = (evt) => {
            try {
                const payload = JSON.parse(evt.data as string) as SSEPayload;
                onEventRef.current(payload);
                if (payload.type === 'done' || payload.type === 'error') {
                    close();
                }
            } catch {
                // ignore malformed SSE frames
            }
        };

        es.onerror = () => {
            close();
        };

        return close;
    }, [auditId, close]);

    return close;
}
