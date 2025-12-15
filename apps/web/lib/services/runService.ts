export interface CreateRunParams {
    dungeonId?: string; // Optional - will be randomly selected if not provided
    party: string[]; // NFT token IDs
    seed?: string;
    paymentHash?: string;
    walletAddress: string;
}

export interface RunStatus {
    id: string;
    dungeon_id: string;
    party: string[];
    seed: string;
    start_time: string;
    end_time?: string;
    result?: 'victory' | 'defeat' | 'timeout' | 'abandoned' | 'error';
    status?: 'queued' | 'running' | 'completed' | 'failed';
}

export const runService = {
    /**
     * Create a new run
     */
    async createRun(params: CreateRunParams): Promise<{ id: string; status: string }> {
        const res = await fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to create run' }));
            throw new Error(error.error || 'Failed to create run');
        }

        return res.json();
    },

    /**
     * Get run status
     */
    async getRunStatus(runId: string): Promise<RunStatus> {
        const res = await fetch(`/api/runs/${runId}`);

        if (!res.ok) {
            throw new Error('Failed to fetch run status');
        }

        return res.json();
    },
};
