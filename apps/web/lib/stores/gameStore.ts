import { create } from 'zustand';
import { INITIAL_PARTY, MOCK_LOGS } from '../constants';
import { Agent, GameView, LogEntry } from '../types';
import { WorldContentEntry } from '../world/content/types/world-content';
import { Geography } from '../world/generation/types/world-generation';

interface GameState {
    currentView: GameView;
    party: Agent[];
    selectedAgentId: string | null;
    selectedPartyTokenIds: string[]; // NFT token IDs for run creation
    currentRunId: string | null; // Current active run ID
    logs: LogEntry[];
    day: number;
    keepBalance: string; // BigInt as string
    maps: Geography[];
    items: WorldContentEntry[];

    // Actions
    switchView: (view: GameView) => void;
    selectAgent: (id: string | null) => void;
    addLog: (log: LogEntry) => void;
    setParty: (party: Agent[]) => void;
    setSelectedPartyTokenIds: (tokenIds: string[]) => void;
    setCurrentRunId: (runId: string | null) => void;
    updateAgent: (id: string, updates: Partial<Agent>) => void;
    setKeepBalance: (balance: string) => void;
    setMaps: (maps: Geography[]) => void;
    setItems: (items: WorldContentEntry[]) => void;
}

export const useGameStore = create<GameState>((set) => ({
    currentView: GameView.INN,
    party: INITIAL_PARTY,
    selectedAgentId: null,
    selectedPartyTokenIds: [],
    currentRunId: null,
    logs: MOCK_LOGS,
    day: 1,
    keepBalance: "0",
    maps: [],
    items: [],

    switchView: (view) => set({ currentView: view }),
    selectAgent: (id) => set({ selectedAgentId: id }),
    addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
    setParty: (party) => set({ party }),
    setSelectedPartyTokenIds: (tokenIds) => set({ selectedPartyTokenIds: tokenIds }),
    setCurrentRunId: (runId) => set({ currentRunId: runId }),
    updateAgent: (id, updates) => set((state) => ({
        party: state.party.map(agent =>
            agent.id === id ? { ...agent, ...updates } : agent
        )
    })),
    setKeepBalance: (balance) => set({ keepBalance: balance }),
    setMaps: (maps) => set({ maps }),
    setItems: (items) => set({ items }),
}));
