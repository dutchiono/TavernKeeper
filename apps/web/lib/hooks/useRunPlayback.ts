
import { useEffect, useRef } from 'react';
import { useReplayStore } from '../stores/replayStore';

export function useRunPlayback(runId: string | null) {
    const { setEvents, tick } = useReplayStore();
    const lastTimeRef = useRef<number>(0);
    const rafRef = useRef<number | null>(null);

    // Fetch full history
    useEffect(() => {
        if (!runId) return;

        const fetchHistory = async () => {
            try {
                // Fetch events from the specialized endpoint
                const res = await fetch(`/api/runs/${runId}/events`);
                if (!res.ok) throw new Error('Failed to load run events');

                const data = await res.json();

                if (data.events) {
                    setEvents(data.events);
                }
            } catch (e) {
                console.error("Failed to load replay data", e);
            }
        };

        fetchHistory();
    }, [runId, setEvents]);

    // Animation Loop
    useEffect(() => {
        const loop = (time: number) => {
            if (lastTimeRef.current !== 0) {
                const delta = time - lastTimeRef.current;
                tick(delta);
            }
            lastTimeRef.current = time;
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [tick]);

    return {};
}
