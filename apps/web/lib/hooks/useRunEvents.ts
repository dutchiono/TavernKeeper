import { useEffect, useRef, useState } from 'react';

export interface RunEvent {
    id: string;
    run_id: string;
    type: string;
    payload: any;
    timestamp: string;
}

export function useRunEvents(runId: string | null, pollInterval = 3000) {
    const [events, setEvents] = useState<RunEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastTimestampRef = useRef<string | null>(null);
    const consecutiveEmptyFetchesRef = useRef<number>(0);
    const isCompletedRef = useRef<boolean>(false);

    useEffect(() => {
        if (!runId) {
            setEvents([]);
            lastTimestampRef.current = null;
            consecutiveEmptyFetchesRef.current = 0;
            isCompletedRef.current = false;
            return;
        }

        let intervalId: NodeJS.Timeout | null = null;

        const fetchEvents = async () => {
            // Skip if we've determined the run is complete
            if (isCompletedRef.current) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const url = lastTimestampRef.current
                    ? `/api/runs/${runId}/events?since=${encodeURIComponent(lastTimestampRef.current)}`
                    : `/api/runs/${runId}/events`;

                const res = await fetch(url);
                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unknown error');
                    throw new Error(`Failed to fetch events: ${res.status} ${res.statusText} - ${errorText}`);
                }

                const data = await res.json().catch(() => ({ events: [] }));
                const { events: newEvents } = data;

                if (newEvents && newEvents.length > 0) {
                    consecutiveEmptyFetchesRef.current = 0;
                    setEvents(prev => {
                        // Merge and deduplicate by id
                        const existingIds = new Set(prev.map(e => e.id));
                        const uniqueNew = newEvents.filter((e: RunEvent) => !existingIds.has(e.id));
                        return [...prev, ...uniqueNew].sort((a, b) =>
                            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        );
                    });

                    // Update last timestamp
                    const latestEvent = newEvents[newEvents.length - 1];
                    lastTimestampRef.current = latestEvent.timestamp;
                    
                    // Check if run is complete (has defeat/victory event)
                    const hasCompletionEvent = newEvents.some(e => 
                        e.payload?.type === 'combat_defeat' || 
                        e.payload?.type === 'party_wipe' ||
                        e.payload?.type === 'victory' ||
                        e.type === 'combat_defeat' ||
                        e.type === 'party_wipe' ||
                        e.type === 'victory'
                    );
                    if (hasCompletionEvent) {
                        isCompletedRef.current = true;
                        if (intervalId) {
                            clearInterval(intervalId);
                            intervalId = null;
                        }
                    }
                } else {
                    // No new events - increment counter
                    consecutiveEmptyFetchesRef.current++;
                    // Stop polling after 10 consecutive empty fetches (30 seconds)
                    if (consecutiveEmptyFetchesRef.current >= 10) {
                        isCompletedRef.current = true;
                        if (intervalId) {
                            clearInterval(intervalId);
                            intervalId = null;
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching run events:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch events');
            } finally {
                setLoading(false);
            }
        };

        // Fetch immediately
        fetchEvents();

        // Poll for updates (slower polling - 3 seconds instead of 1.5)
        intervalId = setInterval(fetchEvents, pollInterval);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [runId, pollInterval]);

    // Filter combat events
    const combatEvents = events.filter(e =>
        e.type === 'combat' ||
        e.type === 'damage' ||
        e.type === 'attack' ||
        e.payload?.type === 'combat' ||
        e.payload?.type === 'damage' ||
        e.payload?.type === 'attack'
    );

    return { events, combatEvents, loading, error };
}
