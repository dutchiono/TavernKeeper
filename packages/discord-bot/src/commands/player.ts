import { ChatInputCommandInteraction } from 'discord.js';
import { GameApiService } from '../services/game-api';
import { Command } from './index';

const gameApi = new GameApiService();

export const playerCommands: Command[] = [
  {
    name: 'player',
    description: 'Look up player stats and heroes',
    execute: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply();

      const wallet = interaction.options.getString('wallet', true);

      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        await interaction.editReply({
          content: '❌ Invalid wallet address format. Please provide a valid Ethereum/Monad address (0x...).',
        });
        return;
      }

      const heroes = await gameApi.getPlayerHeroes(wallet);

      if (heroes.length === 0) {
        await interaction.editReply({
          content: `No heroes found for wallet \`${wallet}\`.`,
        });
        return;
      }

      const embed: any = {
        title: 'Player Heroes',
        description: `**Wallet:** \`${wallet}\`\n**Hero Count:** ${heroes.length}`,
        fields: heroes.slice(0, 10).map((hero, idx) => ({
          name: `Hero #${idx + 1}`,
          value: `Token ID: ${hero.tokenId || hero.id || 'Unknown'}`,
          inline: true,
        })),
        color: 0x5865f2,
      };

      if (heroes.length > 10) {
        embed.footer = {
          text: `Showing 10 of ${heroes.length} heroes`,
        };
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },
];
