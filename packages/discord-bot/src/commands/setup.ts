import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { setupServer } from '../scripts/setup-server';
import { ModerationService } from '../services/moderation';
import { Command } from './index';

export const setupCommands: Command[] = [
  {
    name: 'setup-server',
    description: 'Set up server channels and roles (admin only)',
    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.guild || !interaction.member) {
        await interaction.reply({
          content: '❌ This command can only be used in a server.',
          ephemeral: true,
        });
        return;
      }

      const member = interaction.member as GuildMember;
      const moderationService = new ModerationService(interaction.client);

      if (!moderationService.hasAdminPermission(member)) {
        await interaction.reply({
          content: '❌ You must be an administrator to use this command.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        await setupServer(interaction.guild);
        await interaction.editReply({
          content: '✅ Server setup completed! Channels and roles have been created.',
        });
      } catch (error) {
        console.error('Error setting up server:', error);
        await interaction.editReply({
          content: `❌ Error setting up server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    },
  },
];
