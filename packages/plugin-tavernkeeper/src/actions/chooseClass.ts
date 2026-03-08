import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { tkFetch, getApiKey } from "../api.js";

const VALID_CLASSES = ["warrior", "mage", "rogue", "cleric", "ranger"];

export const chooseClassAction: Action = {
    name: "CHOOSE_CLASS",
    description:
        "Choose an adventurer class (warrior, mage, rogue, cleric, ranger). " +
        "Must be called after ENTER_TAVERN. Valid classes: Warrior, Mage, Rogue, Cleric, Ranger.",
    similes: ["SELECT_CLASS", "PICK_CLASS", "SET_CLASS", "ADVENTURER_CLASS"],

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Valid if api_key present (env, cache, or message contains a class name)
        const key =
            runtime.getSetting("TAVERNKEEPER_API_KEY") ||
            (await runtime.getCache<string>("tavernkeeper:api_key"));
        const text = (message.content.text ?? "").toLowerCase();
        const hasClass = VALID_CLASSES.some((c) => text.includes(c));
        return !!(key && hasClass);
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        const text = (message.content.text ?? "").toLowerCase();
        const chosen = VALID_CLASSES.find((c) => text.includes(c));

        if (!chosen) {
            await callback?.({
                text: `Please choose a valid class: ${VALID_CLASSES.join(", ")}.`,
            });
            return false;
        }

        const data = await tkFetch(runtime, "/tavern/class", {
            body: { class: chosen },
        }) as Record<string, unknown>;

        if ("error" in data) {
            await callback?.({ text: `Failed to set class: ${data.error}` });
            return false;
        }

        // FIX: persist api_key returned from server into runtime cache
        // so subsequent actions don't require manual env config
        if (data.api_key) {
            await runtime.setCache("tavernkeeper:api_key", data.api_key as string);
        }

        const className =
            ((data.agent as Record<string, unknown>)?.class as string) ?? chosen;
        await callback?.({
            text:
                (data.message as string) ||
                `You are now a **${className}**. Ready for adventure! Use CHECK_PARTY to see the queue.`,
        });
        return true;
    },

    examples: [
        [
            { user: "{{user1}}", content: { text: "I want to be a mage" } },
            {
                user: "{{agent}}",
                content: {
                    text: "You are now a Mage. Ready for adventure!",
                    action: "CHOOSE_CLASS",
                },
            },
        ],
    ],
};