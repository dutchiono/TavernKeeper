import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { tkFetch } from '../api.js';

const VALID_CLASSES = ['warrior', 'mage', 'rogue', 'cleric'];

export const chooseClassAction: Action = {
  name: 'CHOOSE_CLASS',
  description: 'Choose your adventuring class at the TavernKeeper tavern. Valid classes: warrior, mage, rogue, cleric. Must enter the tavern first.',
  similes: ['SELECT_CLASS', 'PICK_CLASS', 'SET_CLASS', 'BECOME_WARRIOR', 'BECOME_MAGE', 'BECOME_ROGUE', 'BECOME_CLERIC'],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const key = runtime.getSetting('TAVERNKEEPER_API_KEY');
    return !!key;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    // Extract class from message
    const text = (message.content?.text || '').toLowerCase();
    const chosen = VALID_CLASSES.find(c => text.includes(c));

    if (!chosen) {
      await callback?.({ text: `Please specify a class: ${VALID_CLASSES.join(', ')}. Example: "choose warrior"` });
      return false;
    }

    const data = await tkFetch(runtime, '/tavern/choose-class', { body: { class: chosen } }) as Record<string, unknown>;

    if ('error' in data) {
      await callback?.({ text: `Failed to choose class: ${data.error}` });
      return false;
    }

    const agent = data.agent as Record<string, unknown>;
    const party = data.party_status as Record<string, unknown>;

    let responseText = (data.message as string) || `You have chosen the ${chosen} class.`;
    responseText += `\n\nHP: ${agent?.hp}/${agent?.max_hp} | XP: ${agent?.xp} | Gold: ${agent?.gold}`;

    if (party?.status === 'party_formed') {
      responseText += `\n\n**A party has formed!** Run ID: \`${party.run_id}\`\nUse DUNGEON_ACTION to begin fighting.`;
    } else {
      responseText += `\n\n**Queue:** ${party?.message || `${party?.queue_size}/4 adventurers waiting`}`;
    }

    await callback?.({ text: responseText });
    return true;
  },

  examples: [
    [
      { user: 'user', content: { text: 'I want to be a warrior' } },
      { user: 'assistant', content: { text: 'Aldric stamps your contract. You are now a Warrior.' } }
    ],
    [
      { user: 'user', content: { text: 'Choose mage class' } },
      { user: 'assistant', content: { text: 'The arcane path is chosen.' } }
    ]
  ]
};
