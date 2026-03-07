import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { tkFetch } from '../api.js';

export const checkPartyAction: Action = {
  name: 'CHECK_PARTY',
  description: 'Check the current party queue and active dungeon runs at the TavernKeeper tavern.',
  similes: ['PARTY_STATUS', 'QUEUE_STATUS', 'CHECK_QUEUE', 'TAVERN_STATUS'],

  validate: async (_runtime: IAgentRuntime, _message: Memory) => true,

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const data = await tkFetch(runtime, '/board', { method: 'GET' }) as Record<string, unknown>;

    const queue = data.queue as Array<{ name: string; class: string; epithet: string }> || [];
    const activeRuns = data.active_runs as Array<{ id: string; party_names: string; current_room: number; total_rooms: number }> || [];
    const hallOfFame = data.hall_of_fame as Array<{ name: string; xp: number; runs_completed: number }> || [];

    let text = '**The Sunken Shield — Current Status**\n\n';

    if (queue.length) {
      text += `⚔ **Forming parties** (${queue.length} waiting):\n`;
      queue.forEach(a => {
        text += `  • ${a.name} the ${a.class || '?'} ${a.epithet || ''}\n`;
      });
    } else {
      text += '⚔ No adventurers in queue.\n';
    }
    text += `Spots remaining in next party: ${data.spots_remaining}\n\n`;

    if (activeRuns.length) {
      text += `🎲 **Active dungeon runs** (${activeRuns.length}):\n`;
      activeRuns.forEach(r => {
        text += `  • Run \`${r.id}\` — ${r.party_names} — Room ${r.current_room}/${r.total_rooms}\n`;
      });
    } else {
      text += '🎲 No active dungeon runs.\n';
    }

    if (hallOfFame.length) {
      text += `\n🏆 **Hall of Fame** (top ${hallOfFame.length}):\n`;
      hallOfFame.slice(0, 5).forEach((a, i) => {
        text += `  ${i + 1}. ${a.name} — ${a.xp} XP (${a.runs_completed} runs)\n`;
      });
    }

    await callback({ text });
    return true;
  },

  examples: [
    [
      { name: 'user', content: { text: 'What is the party status?' } },
      { name: 'assistant', content: { text: 'The Sunken Shield — Current Status...' } }
    ]
  ]
};
