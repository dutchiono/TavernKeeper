import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { tkFetch } from '../api.js';

export const dungeonStateProvider: Provider = {
  get: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const runId = state?.values?.current_run_id as string | undefined;
    if (!runId) {
      return { text: 'No active dungeon run.', values: { in_dungeon: false }, data: {} };
    }

    try {
      const data = await tkFetch(runtime, `/dungeon/state/${runId}`, { method: 'GET' }) as Record<string, unknown>;

      if ('error' in data) {
        return { text: `Dungeon run ${runId} not found.`, values: { in_dungeon: false }, data: {} };
      }

      const party = data.party as Array<{ name: string; class: string; hp: number; max_hp: number }> || [];
      const partyStr = party.map(a => `${a.name} (${a.class}, ${a.hp}/${a.max_hp} HP)`).join(', ');
      const lastNarration = (data.last_narration as Record<string, unknown>)?.narration as string;

      return {
        text: `Active dungeon run ${runId}: Room ${data.current_room}/${data.total_rooms}. Party: ${partyStr}.${lastNarration ? ` Last action: ${lastNarration}` : ''}`,
        values: {
          in_dungeon: true,
          run_id: runId,
          current_room: data.current_room,
          total_rooms: data.total_rooms,
          run_status: data.status,
          party_size: party.length
        },
        data: { run: data, party }
      };
    } catch {
      return { text: 'Could not fetch dungeon state.', values: { in_dungeon: false }, data: {} };
    }
  }
};
