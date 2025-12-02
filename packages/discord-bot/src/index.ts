import { Client, Collection, GatewayIntentBits } from 'discord.js';
import type { Command } from './commands';
import { setupCommands } from './commands';
import { getDiscordConfig } from './config';
import { setupEventHandlers } from './events';
import { ModerationService } from './services/moderation';

declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
  }
}

class DiscordBot {
  private client: Client;
  private moderationService: ModerationService;

  constructor() {
    const config = getDiscordConfig();

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
      ],
    });

    this.moderationService = new ModerationService(this.client);

    // Register commands
    this.client.commands = new Collection();
    setupCommands(this.client);

    // Register event handlers
    setupEventHandlers(this.client, this.moderationService);
  }

  async start() {
    try {
      const config = getDiscordConfig();
      await this.client.login(config.botToken);
      console.log('Discord bot started successfully');
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      process.exit(1);
    }
  }

  async stop() {
    this.client.destroy();
    console.log('Discord bot stopped');
  }
}

// Start bot if running directly
if (require.main === module) {
  const bot = new DiscordBot();

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit - try to keep bot running
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - try to keep bot running
  });

  bot.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });
}

export default DiscordBot;
