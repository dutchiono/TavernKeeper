import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { tkFetch } from "../api.js";

const RUN_ID_CACHE_KEY = "tavernkeeper:current_run_id";

/**
 * Extract run_id only from an explicit "run_id:XXXX" token in text.
 * Never fall back to greedy word matching.
 */
function extractRunId(text: string): string | null {
    const m = text.match(/run_id[:\s]+([a-z0-9_-]{4,64})/i);
    return m ? m[1] : null;
}

export const dungeonAction: Action = {
    name: "DUNGEON_ACTION",
    description:
        "Perform an action inside an active dungeon run (attack, cast spell, use item, flee). " +
        "Only valid while in an active run.",
    similes: ["ATTACK", "CAST_SPELL", "USE_ITEM", "FLEE_DUNGEON", "FIGHT", "DUNGEON_MOVE"],

    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        // Valid if we have an api_key (env or cache) and a cached run_id
        const key =
            runtime.getSetting("TAVERNKEEPER_API_KEY") ||
            (await runtime.getCache<string>("tavernkeeper:api_key"));
        const runId = await runtime.getCache<string>(RUN_ID_CACHE_KEY);
        return !!(key && runId);
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        // Resolve run_id from cache first, then message text as last resort
        let runId = await runtime.getCache<string>(RUN_ID_CACHE_KEY);
        if (!runId) {
            runId = extractRunId(message.content.text ?? "");
        }
        if (!runId) {
            await callback?.({ text: "No active dungeon run found. Join a party first." });
            return false;
        }

        const text = message.content.text ?? "";
        // Parse action from message: "attack the goblin", "cast fireball", "use potion", "flee"
        const actionMatch = text.match(
            /\b(attack|cast|use|flee|defend|inspect|loot)\b[\s]*(.*)/i
        );
        const actionType = actionMatch ? actionMatch[1].toLowerCase() : "attack";
        const target = actionMatch ? actionMatch[2].trim() : "";

        const data = await tkFetch(runtime, `/dungeon/action`, {
            body: { run_id: runId, action: actionType, target },
        }) as Record<string, unknown>;

        if ("error" in data) {
            await callback?.({ text: `Action failed: ${data.error}` });
            return false;
        }

        // Persist run_id in case it wasn't cached yet
        await runtime.setCache(RUN_ID_CACHE_KEY, runId);

        const narrative = (data.narrative as string) || (data.message as string) || "You act.";
        const hp = data.actor_hp !== undefined ? `\n\nYour HP: **${data.actor_hp}**` : "";
        const roomStatus =
            data.room_complete
                ? "\n\n*The room is cleared! Moving to the next chamber...*"
                : "";
        const runOver = data.run_complete
            ? "\n\n**The dungeon run is complete!** Use DEBRIEF to see results."
            : "";

        await callback?.({ text: `${narrative}${hp}${roomStatus}${runOver}` });
        return true;
    },

    examples: [
        [
            { user: "{{user1}}", content: { text: "attack the skeleton" } },
            {
                user: "{{agent}}",
                content: {
                    text: "You swing your blade at the skeleton, dealing 14 damage!",
                    action: "DUNGEON_ACTION",
                },
            },
        ],
        [
            { user: "{{user1}}", content: { text: "cast fireball" } },
            {
                user: "{{agent}}",
                content: {
                    text: "Flames erupt from your hands, scorching all enemies in the room!",
                    action: "DUNGEON_ACTION",
                },
            },
        ],
    ],
};