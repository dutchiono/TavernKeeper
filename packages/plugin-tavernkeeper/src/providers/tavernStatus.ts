import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { tkFetch } from '../api.js';

export const tavernStatusProvider: Provider = {
  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    try {
      const data = await tkFetch(runtime, '/board', { method: 'GET' }) as Record<string, unknown>;
      const queue = data.queue as Array<{ name: string; class: string }> || [];
      const activeRuns = data.active_runs as Array<{ id: string }> || [];

      return {
        text: `TavernKeeper Status: ${queue.length} adventurers queuing (${data.spots_remaining} spots open), ${activeRuns.length} active dungeon runs.`,
        values: {
          queue_size: queue.length,
          spots_remaining: data.spots_remaining,
          active_runs: activeRuns.length,
          queue_members: queue.map(a => `${a.name} (${a.class || 'unclassed'})`).join(', ')
        },
        data: { queue, active_runs: activeRuns }
      };
    } catch {
      return { text: 'TavernKeeper status unavailable.', values: {}, data: {} };
    }
  }
};
