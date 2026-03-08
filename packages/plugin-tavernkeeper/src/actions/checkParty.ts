import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { tkFetch } from "../api.js";

export const checkPartyAction: Action = {
    name: "CHECK_PARTY",
    description:
        "Check the current party queue — who is waiting in the tavern and whether a run has started.",
    similes: ["PARTY_STATUS", "WHO_IS_QUEUED", "QUEUE_STATUS", "CHECK_QUEUE", "PARTY_INFO"],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => true,

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        // FIX: use /tavern/party (party queue), NOT /board (notice board)
        const data = await tkFetch(runtime, "/tavern/party", { auth: false }) as Record<string, unknown>;

        if ("error" in data) {
            await callback?.({ text: `Could not check party: ${data.error}` });
            return false;
        }

        const queue = (data.queue as Array<Record<string, unknown>>) ?? [];
        const activeRun = data.active_run as Record<string, unknown> | null;

        if (activeRun) {
            const members = (activeRun.party as Array<Record<string, unknown>>) ?? [];
            const list = members
                .map((m) => `- **${m.name}** (${m.class}) — ${m.hp} HP`)
                .join("\n");
            await callback?.({
                text: `**Active Dungeon Run** (ID: \`${activeRun.run_id}\`)\n\n${list}`,
            });
            return true;
        }

        if (queue.length === 0) {
            await callback?.({ text: "The tavern is quiet. No adventurers are queued yet." });
            return true;
        }

        const list = queue
            .map((a, i) => `${i + 1}. **${a.name}** (${a.class || "no class"})`)
            .join("\n");
        await callback?.({
            text: `**Party Queue** (${queue.length} waiting):\n\n${list}\n\nThe party sets off when 4 adventurers are ready (or after 2 minutes with 2+).`,
        });
        return true;
    },

    examples: [
        [
            { user: "{{user1}}", content: { text: "who is in the party?" } },
            {
                user: "{{agent}}",
                content: {
                    text: "Party Queue (2 waiting):\n1. Grimwald (Warrior)\n2. Lyra (Mage)",
                    action: "CHECK_PARTY",
                },
            },
        ],
    ],
};