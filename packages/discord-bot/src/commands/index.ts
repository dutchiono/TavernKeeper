import { Client, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { getDiscordConfig } from '../config';
import { contractCommands } from './contract';
import { infoCommands } from './info';
import { modCommands } from './mod';
import { partyCommands } from './party';
import { playerCommands } from './player';
import { setupCommands as setupCommandArray } from './setup';
import { verifyCommands } from './verify';

export interface Command {
  name: string;
  description: string;
  execute: (interaction: any) => Promise<void>;
  permissions?: string[];
  toJSON?: () => any;
}

function buildCommandJSON(command: Command): any {
  const builder = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description);

  // Add options based on command name
  if (command.name === 'game-info') {
    builder.addStringOption((option) =>
      option.setName('topic').setDescription('Topic to learn about').setRequired(false)
    );
  } else if (command.name === 'contract') {
    builder.addStringOption((option) =>
      option.setName('name').setDescription('Contract name (e.g., tavern regulars, town posse)').setRequired(true)
    );
  } else if (command.name === 'player') {
    builder.addStringOption((option) =>
      option.setName('wallet').setDescription('Wallet address (0x...)').setRequired(true)
    );
  } else if (command.name === 'party-info') {
    builder.addStringOption((option) =>
      option.setName('id').setDescription('Party ID').setRequired(true)
    );
  } else if (command.name === 'run-info') {
    builder.addStringOption((option) =>
      option.setName('id').setDescription('Run ID').setRequired(true)
    );
  } else if (command.name === 'verify') {
    builder.addStringOption((option) =>
      option.setName('wallet').setDescription('Your wallet address (0x...)').setRequired(true)
    );
  } else if (command.name === 'warn' || command.name === 'kick') {
    builder
      .addUserOption((option) =>
        option.setName('user').setDescription('User to warn/kick').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Reason').setRequired(false)
      );
  } else if (command.name === 'timeout') {
    builder
      .addUserOption((option) =>
        option.setName('user').setDescription('User to timeout').setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName('duration').setDescription('Duration in minutes').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Reason').setRequired(false)
      );
  }

  return builder.toJSON();
}

export function setupCommands(client: Client) {
  const commands: Command[] = [
    ...infoCommands,
    ...contractCommands,
    ...playerCommands,
    ...partyCommands,
    ...modCommands,
    ...setupCommandArray,
    ...verifyCommands,
  ];

  for (const command of commands) {
    client.commands.set(command.name, command);
  }

  // Register slash commands with Discord
  client.once('clientReady', async () => {
    if (!client.application) return;

    try {
      const config = getDiscordConfig();
      const rest = new REST().setToken(config.botToken);

      const commandsJSON = commands.map((cmd) => buildCommandJSON(cmd));

      if (config.guildId) {
        // Register commands for specific guild (faster, updates immediately)
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
          body: commandsJSON,
        });
        console.log(`Registered ${commands.length} commands for guild ${config.guildId}`);
      } else {
        // Register commands globally (can take up to 1 hour to update)
        await rest.put(Routes.applicationCommands(config.clientId), {
          body: commandsJSON,
        });
        console.log(`Registered ${commands.length} commands globally`);
      }
    } catch (error) {
      console.error('Error registering commands:', error);
    }
  });
}
