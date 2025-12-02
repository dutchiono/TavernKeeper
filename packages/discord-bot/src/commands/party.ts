import { ChatInputCommandInteraction } from 'discord.js';
import { GameApiService } from '../services/game-api';
import { Command } from './index';

const gameApi = new GameApiService();

export const partyCommands: Command[] = [
  {
    name: 'party-info',
    description: 'Get information about a party',
    execute: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply();

      const partyId = interaction.options.getString('id', true);

      const party = await gameApi.getPartyStatus(partyId);

      if (!party) {
        await interaction.editReply({
          content: `❌ Party \`${partyId}\` not found.`,
        });
        return;
      }

      const statusEmoji = {
        waiting: '⏳',
        ready: '✅',
        in_progress: '🎮',
        completed: '🏆',
        cancelled: '❌',
      };

      const embed = {
        title: 'Party Information',
        fields: [
          {
            name: 'Party ID',
            value: `\`${party.id}\``,
            inline: true,
          },
          {
            name: 'Status',
            value: `${statusEmoji[party.status as keyof typeof statusEmoji] || '❓'} ${party.status}`,
            inline: true,
          },
          {
            name: 'Members',
            value: `${party.memberCount}/${party.max_members || 5}`,
            inline: true,
          },
          {
            name: 'Owner',
            value: `\`${party.owner_id}\``,
            inline: true,
          },
          {
            name: 'Dungeon ID',
            value: `\`${party.dungeon_id}\``,
            inline: true,
          },
          ...(party.runId
            ? [
                {
                  name: 'Current Run',
                  value: `\`${party.runId}\``,
                  inline: true,
                },
              ]
            : []),
          ...(party.members && party.members.length > 0
            ? [
                {
                  name: 'Members',
                  value: party.members
                    .map((m: any) => `- Hero #${m.hero_token_id}`)
                    .join('\n'),
                  inline: false,
                },
              ]
            : []),
        ],
        color: 0x5865f2,
      };

      await interaction.editReply({ embeds: [embed] });
    },
  },
  {
    name: 'run-info',
    description: 'Get information about a dungeon run',
    execute: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply();

      const runId = interaction.options.getString('id', true);

      const run = await gameApi.getRunInfo(runId);

      if (!run) {
        await interaction.editReply({
          content: `❌ Run \`${runId}\` not found.`,
        });
        return;
      }

      const resultEmoji = {
        victory: '🏆',
        defeat: '💀',
        timeout: '⏱️',
        abandoned: '🚪',
        error: '❌',
      };

      const embed = {
        title: 'Run Information',
        fields: [
          {
            name: 'Run ID',
            value: `\`${run.id}\``,
            inline: true,
          },
          {
            name: 'Status',
            value: run.result
              ? `${resultEmoji[run.result as keyof typeof resultEmoji] || '❓'} ${run.result}`
              : '🔄 In Progress',
            inline: true,
          },
          {
            name: 'Started',
            value: `<t:${Math.floor(new Date(run.start_time).getTime() / 1000)}:R>`,
            inline: true,
          },
          ...(run.end_time
            ? [
                {
                  name: 'Ended',
                  value: `<t:${Math.floor(new Date(run.end_time).getTime() / 1000)}:R>`,
                  inline: true,
                },
              ]
            : []),
          ...(run.dungeon
            ? [
                {
                  name: 'Dungeon',
                  value: run.dungeon.name,
                  inline: true,
                },
              ]
            : []),
          {
            name: 'Party Size',
            value: `${run.party?.length || 0} heroes`,
            inline: true,
          },
          ...(run.events && run.events.length > 0
            ? [
                {
                  name: 'Events',
                  value: `${run.events.length} events recorded`,
                  inline: true,
                },
              ]
            : []),
        ],
        color: 0x5865f2,
      };

      await interaction.editReply({ embeds: [embed] });
    },
  },
];
