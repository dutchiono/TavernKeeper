import { useEffect, useRef, useState } from 'react';

export interface RunEvent {
    id: string;
    run_id: string;
    type: string;
    payload: any;
    timestamp: string;
}

export function useRunEvents(runId: string | null, pollInterval = 1500) {
    const [events, setEvents] = useState<RunEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastTimestampRef = useRef<string | null>(null);

    useEffect(() => {
        if (!runId) {
            setEvents([]);
            lastTimestampRef.current = null;
            return;
        }

        let intervalId: NodeJS.Timeout | null = null;

        const fetchEvents = async () => {
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

        // Poll for updates
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
