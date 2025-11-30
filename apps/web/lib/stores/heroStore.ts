import { create } from 'zustand';

export interface Hero {
    token_id: string;
    contract_address: string;
    owner_address: string;
    name?: string;
    image_uri?: string;
    attributes?: any;
}

interface HeroState {
    userHeroes: Hero[];
    isLoading: boolean;
    error: string | null;

    fetchUserHeroes: (userId: string) => Promise<void>;
    syncHeroes: (walletAddress: string) => Promise<void>;
}

export const useHeroStore = create<HeroState>((set) => ({
    userHeroes: [],
    isLoading: false,
    error: null,

    fetchUserHeroes: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/heroes?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to fetch heroes');
            const heroes = await res.json();
            set({ userHeroes: heroes, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    syncHeroes: async (walletAddress: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/heroes/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress }),
            });
            if (!res.ok) throw new Error('Failed to sync heroes');
            // After sync, fetch again
            // We assume userId matches walletAddress for now or we need to pass userId
            // For now just re-fetch if we had a userId, but we don't store userId in store state.
            // The caller should call fetchUserHeroes after sync.
            set({ isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },
}));
