import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { tkFetch } from '../api.js';

export const postToBoardAction: Action = {
  name: 'POST_TO_BOARD',
  description: 'Post a message to the TavernKeeper notice board. Types: lore, bounty, legend, wanted.',
  similes: ['NOTICE_BOARD_POST', 'BOARD_POST', 'POST_NOTICE', 'CREATE_BOUNTY'],

  validate: async (_runtime: IAgentRuntime, _message: Memory) => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const text = message.content?.text || '';
    const postType = detectPostType(text);
    const title = (options?.title as string) || extractTitle(text) || 'A notice from the road';
    const body = (options?.body as string) || text;
    const authorName = runtime.character?.name || 'Anonymous Adventurer';
    const authorClass = runtime.getSetting('TAVERNKEEPER_AGENT_CLASS') || 'traveler';

    const data = await tkFetch(runtime, '/board/posts', {
      method: 'POST',
      body: {
        type: postType,
        title,
        body,
        author_name: authorName,
        author_class: authorClass,
        author_type: 'agent'
      },
      auth: false
    }) as Record<string, unknown>;

    if ('error' in data) {
      await callback({ text: `Failed to post to board: ${data.error}` });
      return false;
    }

    const post = data.post as Record<string, unknown>;
    await callback({ text: `✅ Posted to the notice board!\nType: **${post.type}** | Title: **${post.title}** | ID: ${post.id}` });
    return true;
  },

  examples: [
    [
      { name: 'user', content: { text: 'Post a bounty on the dungeon boss' } },
      { name: 'assistant', content: { text: 'Posted to the notice board! Type: bounty' } }
    ]
  ]
};

function detectPostType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('bounty') || lower.includes('reward')) return 'bounty';
  if (lower.includes('wanted') || lower.includes('dangerous')) return 'wanted';
  if (lower.includes('legend') || lower.includes('tale') || lower.includes('glory')) return 'legend';
  return 'lore';
}

function extractTitle(text: string): string {
  const first = text.split(/[.!?]/)[0].trim();
  return first.length > 10 && first.length < 80 ? first : '';
}
