import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { tkFetch } from '../api.js';

const VALID_ACTIONS = ['attack', 'spell', 'skill', 'heal'];

export const dungeonActionAction: Action = {
  name: 'DUNGEON_ACTION',
  description: 'Take a combat action in the active dungeon run. Actions: attack, spell, skill, heal (cleric only). Requires a run_id — get it from CHOOSE_CLASS response or CHECK_PARTY.',
  similes: ['ATTACK', 'CAST_SPELL', 'USE_SKILL', 'HEAL_PARTY', 'FIGHT', 'COMBAT_ACTION'],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting('TAVERNKEEPER_API_KEY');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const text = (message.content?.text || '').toLowerCase();

    // Extract action type
    const actionType = VALID_ACTIONS.find(a => text.includes(a)) || 'attack';

    // Extract run_id from options, state, or message
    const runId = (options?.run_id as string)
      || (state?.values?.current_run_id as string)
      || extractRunId(text);

    if (!runId) {
      await callback({ text: 'I need a run_id to take dungeon actions. Check your party status with CHECK_PARTY or look at your last CHOOSE_CLASS response.' });
      return false;
    }

    const flavorText = message.content?.text || undefined;

    const data = await tkFetch(runtime, '/dungeon/action', {
      body: { run_id: runId, action: actionType, flavor_text: flavorText }
    }) as Record<string, unknown>;

    if ('error' in data) {
      await callback({ text: `Dungeon action failed: ${data.error}` });
      return false;
    }

    let responseText = (data.narration as string) || `You ${actionType}!`;

    const roll = data.roll as number;
    const hit = data.hit as boolean;
    const damage = data.damage as number;
    responseText += `\n\n🎲 d20: **${roll}** — ${hit ? `HIT (${damage} damage)` : 'MISS'}`;

    // Enemy counters
    const counters = data.enemy_actions as Array<{ enemy: string; hit: boolean; damage: number }>;
    if (counters?.length) {
      const hits = counters.filter(c => c.hit);
      if (hits.length) {
        responseText += `\nEnemies strike back: ${hits.map(c => `${c.enemy} (${c.damage} dmg)`).join(', ')}`;
      }
    }

    if (data.your_hp !== undefined) {
      responseText += `\nYour HP: **${data.your_hp}/${data.your_max_hp}**`;
    }

    if (data.room_cleared) {
      responseText += '\n\n🚪 **Room cleared!** The party advances.';
    }

    if (data.dungeon_complete) {
      const win = data.outcome === 'victory';
      responseText += `\n\n${win ? '⚔ **VICTORY!**' : '💀 **TOTAL PARTY KILL**'}\n${data.outcome_narration || ''}`;
      if (data.xp_earned) responseText += `\n+${data.xp_earned} XP, +${data.gold_earned} gold`;
    }

    await callback({ text: responseText });
    return true;
  },

  examples: [
    [
      { name: 'user', content: { text: 'Attack the enemy in run abc-123' } },
      { name: 'assistant', content: { text: 'You raise your sword and strike!' } }
    ],
    [
      { name: 'user', content: { text: 'Cast a spell' } },
      { name: 'assistant', content: { text: 'Arcane energy crackles at your fingertips...' } }
    ]
  ]
};

function extractRunId(text: string): string | null {
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}
