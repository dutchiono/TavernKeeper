import { ChatInputCommandInteraction } from 'discord.js';
import { ConciergeService } from '../services/concierge';
import { Command } from './index';

const concierge = new ConciergeService();

export const infoCommands: Command[] = [
  {
    name: 'help',
    description: 'Get help about available commands',
    execute: async (interaction: ChatInputCommandInteraction) => {
      const embed = {
        title: 'InnKeeper Bot Commands',
        description: 'Here are the available commands:',
        fields: [
          {
            name: '🔐 Verification',
            value: '`/verify [wallet]` - Verify your wallet address (required for full access)',
          },
          {
            name: '📚 Information Commands',
            value: '`/help` - Show this help message\n`/game-info [topic]` - Get information about the game',
          },
          {
            name: '📜 Contract Commands',
            value: '`/contract [name]` - Get contract information (Tavern Regulars, Town Posse, etc.)',
          },
          {
            name: '👤 Player Commands',
            value: '`/player [wallet]` - Look up player stats and heroes',
          },
          {
            name: '👥 Party Commands',
            value: '`/party-info [id]` - Get party information\n`/run-info [id]` - Get run information',
          },
          {
            name: '🛡️ Moderation Commands (Moderator+)',
            value: '`/warn [user] [reason]` - Warn a user\n`/timeout [user] [duration] [reason]` - Timeout a user\n`/kick [user] [reason]` - Kick a user',
          },
          {
            name: '⚙️ Admin Commands',
            value: '`/setup-server` - Set up server channels and roles (admin only)',
          },
        ],
        color: 0x5865f2,
        timestamp: new Date().toISOString(),
      };

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    name: 'game-info',
    description: 'Get information about the game',
    execute: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply();

      const topic = interaction.options.getString('topic', false) || 'general';
      const question = `Tell me about ${topic} in InnKeeper`;

      const answer = await concierge.answerQuestion({
        question,
        userId: interaction.user.id,
        channelId: interaction.channelId,
      });

      await interaction.editReply({
        content: answer,
      });
    },
  },
];
