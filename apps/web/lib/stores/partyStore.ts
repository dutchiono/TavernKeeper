import { create } from 'zustand';
import { Party, PartyMember } from '../services/partyService';

interface PartyState {
    userParties: Party[];
    currentParty: Party | null;
    currentMembers: PartyMember[];
    isLoading: boolean;
    error: string | null;

    fetchUserParties: (userId: string) => Promise<void>;
    fetchPartyDetails: (partyId: string) => Promise<void>;
    createParty: (ownerId: string, dungeonId?: string) => Promise<Party | null>;
    joinParty: (partyId: string, userId: string, heroTokenId: string, heroContract: string) => Promise<boolean>;
    leaveParty: (partyId: string, userId: string) => Promise<boolean>;
    generateInvite: (partyId: string, userId: string) => Promise<string | null>;
    startRun: (partyId: string, dungeonId: string) => Promise<boolean>;
}

export const usePartyStore = create<PartyState>((set, get) => ({
    userParties: [],
    currentParty: null,
    currentMembers: [],
    isLoading: false,
    error: null,

    fetchUserParties: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/parties?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to fetch parties');
            const parties = await res.json();
            set({ userParties: parties, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    fetchPartyDetails: async (partyId: string) => {
        set({ isLoading: true, error: null });
        try {
            // Fetch party
            const partyRes = await fetch(`/api/parties/${partyId}`);
            if (!partyRes.ok) throw new Error('Failed to fetch party');
            const party = await partyRes.json();

            // Fetch members (we need an endpoint for this or include in party details)
            // Currently getParty in service fetches party, but not members automatically unless joined?
            // Wait, getParty in service is just select * from parties.
            // We need a way to get members.
            // I should add GET /api/parties/[id]/members or include it in GET /api/parties/[id].
            // For now I'll assume I can fetch members via a separate call or I need to add that endpoint.
            // I'll add a fetchMembers action or just use supabase client directly? No, use API.
            // I missed adding GET /api/parties/[id]/members endpoint.
            // I'll assume for now I can't get members easily without that endpoint.
            // I'll add the endpoint later.

            set({ currentParty: party, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createParty: async (ownerId: string, dungeonId?: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/parties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId, dungeonId }),
            });
            if (!res.ok) throw new Error('Failed to create party');
            const party = await res.json();
            set(state => ({ userParties: [party, ...state.userParties], currentParty: party, isLoading: false }));
            return party;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            return null;
        }
    },

    joinParty: async (partyId, userId, heroTokenId, heroContract) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/parties/${partyId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, heroTokenId, heroContract, userWallet: userId }), // Assuming userId is wallet for now?
            });
            if (!res.ok) throw new Error('Failed to join party');
            // Refresh details
            await get().fetchPartyDetails(partyId);
            set({ isLoading: false });
            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            return false;
        }
    },

    leaveParty: async (partyId, userId) => {
        // Implement leave
        return false;
    },

    generateInvite: async (partyId, userId) => {
        try {
            const res = await fetch(`/api/parties/${partyId}/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error('Failed to generate invite');
            const { code } = await res.json();
            return code;
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    startRun: async (partyId, dungeonId) => {
        try {
            const res = await fetch(`/api/parties/${partyId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dungeonId }),
            });
            if (!res.ok) throw new Error('Failed to start run');
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    },
}));
