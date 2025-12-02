import { ChatInputCommandInteraction } from 'discord.js';
import { Address } from 'viem';
import { ConciergeService } from '../services/concierge';
import { Command } from './index';

const concierge = new ConciergeService();

// Contract addresses (Monad testnet)
const CONTRACT_ADDRESSES: Record<string, Address> = {
  TAVERN_REGULARS_MANAGER: '0x0000000000000000000000000000000000000000' as Address,
  TOWN_POSSE_MANAGER: '0x0000000000000000000000000000000000000000' as Address,
  THE_CELLAR: '0xaB837301d12cDc4b97f1E910FC56C9179894d9cf' as Address,
  ADVENTURER: '0x67e27a22B64385e0110e69Dceae7d394D2C87B06' as Address,
  INVENTORY: '0x777b17Bda9B9438e67bd155fEfC04Dc184F004C7' as Address,
  TAVERNKEEPER: '0x0F527785e39B22911946feDf580d87a4E00465f0' as Address,
  KEEP_TOKEN: '0xe044814c9eD1e6442Af956a817c161192cBaE98F' as Address,
};

const CONTRACT_INFO: Record<string, { name: string; version: string; proxyType: string }> = {
  TAVERN_REGULARS_MANAGER: {
    name: 'Tavern Regulars Manager',
    version: '1.0.0',
    proxyType: 'UUPS Upgradeable Proxy',
  },
  TOWN_POSSE_MANAGER: {
    name: 'Town Posse Manager',
    version: '1.0.0',
    proxyType: 'UUPS Upgradeable Proxy',
  },
  THE_CELLAR: {
    name: 'The Cellar',
    version: '1.0.0',
    proxyType: 'UUPS Upgradeable Proxy',
  },
  ADVENTURER: {
    name: 'Adventurer NFT',
    version: '1.0.0',
    proxyType: 'UUPS Upgradeable Proxy',
  },
  INVENTORY: {
    name: 'Inventory',
    version: '1.0.0',
    proxyType: 'UUPS Upgradeable Proxy',
  },
  TAVERNKEEPER: {
    name: 'TavernKeeper',
    version: '1.0.0',
    proxyType: 'UUPS Upgradeable Proxy',
  },
  KEEP_TOKEN: {
    name: 'KEEP Token',
    version: '1.0.0',
    proxyType: 'UUPS Upgradeable Proxy',
  },
};

export const contractCommands: Command[] = [
  {
    name: 'contract',
    description: 'Get information about a contract',
    execute: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply();

      const contractName = interaction.options.getString('name', true).toLowerCase();

      // Map user-friendly names to contract registry keys
      const contractMap: Record<string, string> = {
        'tavern regulars': 'TAVERN_REGULARS_MANAGER',
        'tavern-regulars': 'TAVERN_REGULARS_MANAGER',
        'bar regulars': 'TAVERN_REGULARS_MANAGER',
        'bar-regulars': 'TAVERN_REGULARS_MANAGER',
        'town posse': 'TOWN_POSSE_MANAGER',
        'town-posse': 'TOWN_POSSE_MANAGER',
        'cellar': 'THE_CELLAR',
        'the-cellar': 'THE_CELLAR',
        'adventurer': 'ADVENTURER',
        'inventory': 'INVENTORY',
        'tavernkeeper': 'TAVERNKEEPER',
        'keep token': 'KEEP_TOKEN',
        'keep-token': 'KEEP_TOKEN',
        'keep': 'KEEP_TOKEN',
      };

      const registryKey = contractMap[contractName];

      if (registryKey && CONTRACT_ADDRESSES[registryKey] && CONTRACT_INFO[registryKey]) {
        const contract = CONTRACT_INFO[registryKey];
        const address = CONTRACT_ADDRESSES[registryKey];

        const embed = {
          title: `${contract.name}`,
          description: `**Address:** \`${address}\`\n**Version:** ${contract.version}\n**Chain:** Monad Testnet`,
          fields: [
          {
            name: 'Contract Type',
            value: contract.proxyType,
            inline: true,
          },
            {
              name: 'Chain ID',
              value: '10143',
              inline: true,
            },
          ],
          color: 0x5865f2,
        };

        // Add contract-specific information
        if (registryKey === 'TAVERN_REGULARS_MANAGER') {
          embed.fields.push({
            name: 'About Tavern Regulars',
            value: 'Small groups (3-10 members) that pool liquidity. Fee split: 80% members, 20% pot. 1% contribution tax.',
            inline: false,
          });
        } else if (registryKey === 'TOWN_POSSE_MANAGER') {
          embed.fields.push({
            name: 'About Town Posse',
            value: 'Large groups (10-100+ members) with tiered membership and governance. Fee split: 75% members, 20% pot, 5% treasury.',
            inline: false,
          });
        }

        await interaction.editReply({ embeds: [embed] });
      } else {
        // Use concierge for general contract questions
        const answer = await concierge.answerQuestion({
          question: `Tell me about the ${contractName} contract`,
          userId: interaction.user.id,
          channelId: interaction.channelId,
        });

        await interaction.editReply({
          content: answer,
        });
      }
    },
  },
];
