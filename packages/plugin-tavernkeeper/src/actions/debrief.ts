import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { tkFetch } from "../api.js";

export const debriefAction: Action = {
    name: "DEBRIEF",
    description:
        "Get the debrief summary of the most recently completed dungeon run. " +
        "Shows rooms cleared, outcome, XP earned, gold, and loot.",
    similes: ["RUN_SUMMARY", "DUNGEON_RESULTS", "SHOW_LOOT", "SHOW_XP", "DEBRIEF_RUN"],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => true,

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        const data = await tkFetch(runtime, "/dungeon/debrief") as Record<string, unknown>;

        if ("error" in data) {
            await callback?.({ text: `Could not retrieve debrief: ${data.error}` });
            return false;
        }

        const lastRun = data.last_run as Record<string, unknown> | undefined;
        if (!lastRun) {
            await callback?.({ text: "No completed dungeon runs found for your agent." });
            return false;
        }

        // FIX: use total_rooms from the run record, not a hardcoded /3
        const totalRooms = lastRun.total_rooms ?? lastRun.rooms?.length ?? "?";
        const outcome = lastRun.outcome === "victory" ? "Victory!" : "Defeated.";
        const earnedXp = lastRun.earned_xp ?? 0;
        const earnedGold = lastRun.earned_gold ?? 0;
        const totalXp = lastRun.total_xp ?? 0;
        const level = lastRun.level ?? Math.floor((totalXp as number) / 200);
        const loot = lastRun.loot as string | null;

        let text =
            `## Dungeon Debrief\n\n` +
            `**Outcome:** ${outcome}\n` +
            `**Rooms Cleared:** ${lastRun.rooms_cleared}/${totalRooms}\n` +
            `**XP Earned:** +${earnedXp} XP (Total: ${totalXp} | Level ${level})\n` +
            `**Gold Earned:** ${earnedGold} gp\n`;

        if (loot) {
            text += `**Loot:** ${loot}\n`;
        }

        if (lastRun.party) {
            text += `\n**Party:**\n`;
            for (const member of lastRun.party as Array<Record<string, unknown>>) {
                const status = (member.hp as number) > 0 ? `${member.hp} HP` : "Fallen";
                text += `- ${member.name} (${member.class}): ${status}\n`;
            }
        }

        // Clear cached run_id since this run is over
        await runtime.setCache("tavernkeeper:current_run_id", null);

        await callback?.({ text });
        return true;
    },

    examples: [
        [
            { user: "{{user1}}", content: { text: "show me the debrief" } },
            {
                user: "{{agent}}",
                content: {
                    text: "## Dungeon Debrief\n\nOutcome: Victory!\nRooms Cleared: 4/4\n+200 XP | 42 gp",
                    action: "DEBRIEF",
                },
            },
        ],
    ],
};