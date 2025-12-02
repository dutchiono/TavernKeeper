import { getGameApiConfig } from '../config';

export interface PartyStatus {
  id: string;
  owner_id: string;
  dungeon_id: string;
  status: 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  members: Array<{
    user_id: string;
    hero_token_id: string;
    hero_contract_address: string;
  }>;
  memberCount: number;
  max_members?: number;
  isFull: boolean;
  runId?: string;
}

export interface RunInfo {
  id: string;
  dungeon_id: string;
  party: string[];
  start_time: string;
  end_time?: string;
  result?: 'victory' | 'defeat' | 'timeout' | 'abandoned' | 'error';
  runLogs: Array<{
    id: string;
    run_id: string;
    message: string;
    timestamp: string;
  }>;
  events: Array<{
    id: string;
    run_id: string;
    type: string;
    payload: any;
    timestamp: string;
  }>;
  dungeon?: {
    id: string;
    name: string;
    description: string;
  };
}

export interface HeroInfo {
  tokenId?: string;
  id?: string;
  owner: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: any }>;
  };
}

export class GameApiService {
  private baseUrl: string;

  constructor() {
    const config = getGameApiConfig();
    this.baseUrl = config.baseUrl;
  }

  async getPartyStatus(partyId: string): Promise<PartyStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/parties/${partyId}/status`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch party: ${response.statusText}`);
      }
      return (await response.json()) as PartyStatus;
    } catch (error) {
      console.error('Error fetching party status:', error);
      return null;
    }
  }

  async getRunInfo(runId: string): Promise<RunInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/runs/${runId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch run: ${response.statusText}`);
      }
      return (await response.json()) as RunInfo;
    } catch (error) {
      console.error('Error fetching run info:', error);
      return null;
    }
  }

  async getPlayerHeroes(walletAddress: string): Promise<HeroInfo[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/heroes/owned?walletAddress=${encodeURIComponent(walletAddress)}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch heroes: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching player heroes:', error);
      return [];
    }
  }

  async getHeroInfo(tokenId: string): Promise<HeroInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/heroes/token?tokenId=${tokenId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch hero: ${response.statusText}`);
      }
      return (await response.json()) as HeroInfo;
    } catch (error) {
      console.error('Error fetching hero info:', error);
      return null;
    }
  }
}
