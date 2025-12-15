import { useEffect, useRef, useState } from 'react';
import { runService, RunStatus } from '../services/runService';

export function useRunStatus(runId: string | null, pollInterval = 5000) {
    const [status, setStatus] = useState<RunStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isCompletedRef = useRef<boolean>(false);

    useEffect(() => {
        if (!runId) {
            setStatus(null);
            isCompletedRef.current = false;
            return;
        }

        let intervalId: NodeJS.Timeout | null = null;

        const fetchStatus = async () => {
            // Skip if already completed
            if (isCompletedRef.current) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const runStatus = await runService.getRunStatus(runId);
                setStatus(runStatus);

                // Stop polling if run is completed (has result or end_time)
                const isCompleted = runStatus.result || runStatus.end_time || runStatus.status === 'completed' || runStatus.status === 'failed';
                if (isCompleted) {
                    isCompletedRef.current = true;
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }
            } catch (err) {
                console.error('Error fetching run status:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch run status');
            } finally {
                setLoading(false);
            }
        };

        // Fetch immediately
        fetchStatus();

        // Poll for updates (slower - 5 seconds instead of 2)
        intervalId = setInterval(fetchStatus, pollInterval);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [runId, pollInterval]);

    return { status, loading, error };
}
