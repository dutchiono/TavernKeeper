import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { VerificationService } from '../services/verification';
import { Command } from './index';

export const verifyCommands: Command[] = [
  {
    name: 'verify',
    description: 'Verify your wallet address to access server features',
    execute: async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.guild || !interaction.member) {
        await interaction.reply({
          content: '❌ This command can only be used in a server.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const wallet = interaction.options.getString('wallet', true);
      const member = interaction.member as GuildMember;

      const verificationService = new VerificationService(interaction.client);
      const result = await verificationService.verifyWallet(member, wallet);

      if (result.success) {
        await interaction.editReply({
          content: `${result.message}\n\n✅ You now have access to all server channels!\n\n🎮 You can now:\n- Access all game channels\n- Join parties\n- Participate in Regulars and Town Posse groups\n- Use all bot commands`,
        });
      } else {
        await interaction.editReply({
          content: `❌ ${result.message}`,
        });
      }
    },
  },
];
