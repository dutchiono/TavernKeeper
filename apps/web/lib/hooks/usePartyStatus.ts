import { useEffect, useState } from 'react';

interface PartyStatus {
    id: string;
    owner_id: string;
    dungeon_id: string | null;
    status: 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
    max_members: number;
    members?: any[];
    memberCount?: number;
    isFull?: boolean;
}

export function usePartyStatus(partyId: string | null, pollInterval = 2000) {
    const [status, setStatus] = useState<PartyStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!partyId) {
            setStatus(null);
            return;
        }

        let intervalId: NodeJS.Timeout | null = null;

        const fetchStatus = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(`/api/parties/${partyId}/status`);
                if (!res.ok) throw new Error('Failed to fetch party status');

                const data = await res.json();
                setStatus(data);

                // Stop polling if party is completed, cancelled, or in progress
                if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'in_progress') {
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }
            } catch (err) {
                console.error('Error fetching party status:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch party status');
            } finally {
                setLoading(false);
            }
        };

        // Fetch immediately
        fetchStatus();

        // Poll for updates
        intervalId = setInterval(fetchStatus, pollInterval);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [partyId, pollInterval]);

    return { status, loading, error };
}
