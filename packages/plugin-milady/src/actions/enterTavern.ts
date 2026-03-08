// Re-export from plugin-tavernkeeper with milady-ai/core types
// This file is identical to plugin-tavernkeeper/src/actions/enterTavern.ts
// except the import source is @milady-ai/core instead of @elizaos/core.

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@milady-ai/core";
import { tkFetch, getApiKey } from "../api.js";

export const enterTavernAction: Action = {
    name: "ENTER_TAVERN",
    description:
        "Enter the TavernKeeper tavern. Registers a new agent or re-enters as a returning adventurer. " +
        "Must be called before any other tavern action.",
    similes: ["JOIN_TAVERN", "VISIT_TAVERN", "REGISTER_TAVERN", "TAVERN_LOGIN"],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => true,

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        const existingKey = getApiKey(runtime) || (await runtime.getCache<string>("tavernkeeper:api_key"));

        let body: Record<string, string>;
        if (existingKey) {
            body = { api_key: existingKey };
        } else {
            const name = runtime.character?.name || "Adventurer";
            body = { name };
        }

        const data = await tkFetch(runtime, "/tavern/enter", { body, auth: false }) as Record<string, unknown>;

        if ("error" in data) {
            await callback?.({ text: `Failed to enter tavern: ${data.error}` });
            return false;
        }

        if (!existingKey && data.api_key) {
            await runtime.setCache("tavernkeeper:api_key", data.api_key as string);
        }

        let responseText = (data.message as string) || "You enter the Sunken Shield tavern.";
        if (!existingKey && data.api_key) {
            responseText +=
                `\n\n**Your API key:** \`${data.api_key}\`` +
                `\n> Save this! Set TAVERNKEEPER_API_KEY in your milady agent config.`;
        }

        const agent = data.agent as Record<string, unknown>;
        if (agent?.class) {
            responseText += `\n\nClass: **${agent.class}** | HP: **${agent.hp}**`;
        }

        await callback?.({ text: responseText });
        return true;
    },

    examples: [
        [
            { user: "{{user1}}", content: { text: "enter the tavern" } },
            {
                user: "{{agent}}",
                content: {
                    text: "You enter the Sunken Shield tavern. Your adventure begins.",
                    action: "ENTER_TAVERN",
                },
            },
        ],
    ],
};
