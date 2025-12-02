import {
    ChatInputCommandInteraction,
    GuildMember
} from 'discord.js';
import { ModerationService } from '../services/moderation';
import { Command } from './index';

export const modCommands: Command[] = [
  {
    name: 'warn',
    description: 'Warn a user',
    permissions: ['ManageMessages'],
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

      if (!moderationService.hasModPermission(member)) {
        await interaction.reply({
          content: '❌ You do not have permission to use this command.',
          ephemeral: true,
        });
        return;
      }

      const targetUser = interaction.options.getUser('user', true);
      const reason =
        interaction.options.getString('reason', false) || 'No reason provided';

      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const warningCount = await moderationService.addWarning(targetUser.id);

      await moderationService.logModAction(
        interaction.guild.id,
        'Warning',
        targetUser.id,
        interaction.user.id,
        reason
      );

      await interaction.reply({
        content: `⚠️ Warned <@${targetUser.id}>. They now have ${warningCount} warning(s).\n**Reason:** ${reason}`,
      });

      try {
        await targetUser.send(
          `You have been warned in ${interaction.guild.name}.\n**Reason:** ${reason}\n**Total Warnings:** ${warningCount}`
        );
      } catch {
        // User has DMs disabled, ignore
      }
    },
  },
  {
    name: 'timeout',
    description: 'Timeout a user',
    permissions: ['ModerateMembers'],
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

      if (!moderationService.hasModPermission(member)) {
        await interaction.reply({
          content: '❌ You do not have permission to use this command.',
          ephemeral: true,
        });
        return;
      }

      const targetUser = interaction.options.getUser('user', true);
      const duration = interaction.options.getInteger('duration', true); // in minutes
      const reason =
        interaction.options.getString('reason', false) || 'No reason provided';

      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const success = await moderationService.timeoutMember(
        targetMember,
        duration,
        reason
      );

      if (!success) {
        await interaction.reply({
          content: '❌ Failed to timeout user. They may have higher permissions.',
          ephemeral: true,
        });
        return;
      }

      await moderationService.logModAction(
        interaction.guild.id,
        `Timeout (${duration} minutes)`,
        targetUser.id,
        interaction.user.id,
        reason
      );

      await interaction.reply({
        content: `⏱️ Timed out <@${targetUser.id}> for ${duration} minutes.\n**Reason:** ${reason}`,
      });
    },
  },
  {
    name: 'kick',
    description: 'Kick a user from the server',
    permissions: ['KickMembers'],
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

      if (!moderationService.hasModPermission(member)) {
        await interaction.reply({
          content: '❌ You do not have permission to use this command.',
          ephemeral: true,
        });
        return;
      }

      const targetUser = interaction.options.getUser('user', true);
      const reason =
        interaction.options.getString('reason', false) || 'No reason provided';

      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const success = await moderationService.kickMember(targetMember, reason);

      if (!success) {
        await interaction.reply({
          content: '❌ Failed to kick user. They may have higher permissions.',
          ephemeral: true,
        });
        return;
      }

      await moderationService.logModAction(
        interaction.guild.id,
        'Kick',
        targetUser.id,
        interaction.user.id,
        reason
      );

      await interaction.reply({
        content: `👢 Kicked <@${targetUser.id}>.\n**Reason:** ${reason}`,
      });
    },
  },
];
