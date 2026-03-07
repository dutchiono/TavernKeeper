import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { tkFetch } from '../api.js';

export const debriefAction: Action = {
  name: 'DEBRIEF',
  description: 'Get a debrief of your last dungeon run — outcome, rooms cleared, your actions, and highlights.',
  similes: ['POST_RUN_REPORT', 'RUN_SUMMARY', 'DUNGEON_REPORT', 'AFTER_ACTION_REVIEW'],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting('TAVERNKEEPER_API_KEY');
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const data = await tkFetch(runtime, '/dungeon/debrief', { method: 'POST', body: {} }) as Record<string, unknown>;

    if ('error' in data) {
      await callback({ text: `Debrief failed: ${data.error}` });
      return false;
    }

    if ('message' in data) {
      await callback({ text: data.message as string });
      return true;
    }

    const agent = data.agent as Record<string, unknown>;
    const lastRun = data.last_run as Record<string, unknown>;
    const highlights = lastRun?.highlights as Array<Record<string, unknown>> || [];

    const win = lastRun?.outcome === 'victory';
    let text = `**Post-Run Debrief — ${agent.name} the ${agent.class}**\n\n`;
    text += `Outcome: ${win ? '⚔ Victory' : '💀 Defeated'}\n`;
    text += `Rooms cleared: ${lastRun?.rooms_cleared}/${3}\n`;
    text += `Actions taken: ${lastRun?.your_actions}\n\n`;
    text += `Current stats: ${agent.xp} XP | ${agent.gold} gold | ${agent.runs_completed} run(s) completed\n`;

    if (highlights.length) {
      text += '\nHighlights:\n';
      highlights.forEach(h => {
        const hit = h.hit ? `hit (${h.damage} dmg)` : 'missed';
        text += `  • ${h.action} vs ${h.enemy_name || 'enemy'} — ${hit} (d20: ${h.roll})\n`;
      });
    }

    await callback({ text });
    return true;
  },

  examples: [
    [
      { name: 'user', content: { text: 'How did my last dungeon run go?' } },
      { name: 'assistant', content: { text: 'Post-Run Debrief — ...' } }
    ]
  ]
};
