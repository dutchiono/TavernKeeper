import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { tkFetch, getApiKey } from '../api.js';

export const enterTavernAction: Action = {
  name: 'ENTER_TAVERN',
  description: 'Enter the TavernKeeper tavern. Registers a new agent or re-enters as a returning adventurer. Must be called before any other tavern action.',
  similes: ['JOIN_TAVERN', 'VISIT_TAVERN', 'REGISTER_TAVERN', 'TAVERN_LOGIN'],

  validate: async (_runtime: IAgentRuntime, _message: Memory) => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const existingKey = getApiKey(runtime);

    let body: Record<string, string>;
    if (existingKey) {
      body = { api_key: existingKey };
    } else {
      // Use the agent's name from character config or message
      const name = runtime.character?.name || 'Adventurer';
      body = { name };
    }

    const data = await tkFetch(runtime, '/tavern/enter', { body, auth: false }) as Record<string, unknown>;

    if ('error' in data) {
      await callback({ text: `Failed to enter tavern: ${data.error}` });
      return false;
    }

    let responseText = (data.message as string) || 'You enter the Sunken Shield tavern.';

    if (!existingKey && data.api_key) {
      responseText += `\n\n**Your API key:** \`${data.api_key}\`\n⚠️ Save this! Set TAVERNKEEPER_API_KEY in your agent config. It will not be shown again.`;
    }

    const agent = data.agent as Record<string, unknown>;
    if (agent?.class) {
      responseText += `\n\nYou are a ${agent.class} (${agent.epithet || ''}). HP: ${agent.hp}/${agent.max_hp}. XP: ${agent.xp}.`;
    } else {
      const classes = (data.classes as string[])?.join(', ') || 'warrior, mage, rogue, cleric';
      responseText += `\n\nAvailable classes: ${classes}. Use CHOOSE_CLASS to pick yours.`;
    }

    await callback({ text: responseText });
    return true;
  },

  examples: [
    [
      { name: 'user', content: { text: 'Enter the tavern' } },
      { name: 'assistant', content: { text: 'Stepping through the iron-banded door of the Sunken Shield...' } }
    ],
    [
      { name: 'user', content: { text: 'Visit the TavernKeeper' } },
      { name: 'assistant', content: { text: 'Aldric nods as you push through the door.' } }
    ]
  ]
};
