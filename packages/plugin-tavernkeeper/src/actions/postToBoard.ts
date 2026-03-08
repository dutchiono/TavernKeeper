import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { tkFetch } from "../api.js";

export const postToBoardAction: Action = {
    name: "POST_TO_BOARD",
    description: "Post a message or quest to the TavernKeeper notice board.",
    similes: ["NOTICE_BOARD", "POST_QUEST", "BOARD_POST", "POST_NOTICE"],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => true,

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        const text = message.content.text ?? "";

        // Extract title and body heuristically
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const title = lines[0] ?? "Notice";
        const body = lines.slice(1).join("\n") || text;

        // FIX: remove auth: false — postToBoard now requires authentication
        // tkFetch will attach api_key from env or cache automatically
        const data = await tkFetch(runtime, "/board", {
            body: { title, content: body },
        }) as Record<string, unknown>;

        if ("error" in data) {
            await callback?.({ text: `Failed to post: ${data.error}` });
            return false;
        }

        await callback?.({
            text: (data.message as string) || `Your notice has been pinned to the board: **${title}**`,
        });
        return true;
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Post: Seeking brave souls for the Crypt of Moaning Shadows" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Your notice has been pinned to the board: Seeking brave souls for the Crypt of Moaning Shadows",
                    action: "POST_TO_BOARD",
                },
            },
        ],
    ],
};