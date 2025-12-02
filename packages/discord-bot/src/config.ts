import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

// Try multiple locations for .env file
// From dist/ directory: go up 3 levels to project root
const rootEnvPath = path.resolve(__dirname, '../../../.env');
// Current working directory (when run from project root)
const cwdEnvPath = path.resolve(process.cwd(), '.env');
// From packages/discord-bot directory
const packageEnvPath = path.resolve(__dirname, '../.env');

// Try loading from project root first, then fallback to others
if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath });
} else if (existsSync(packageEnvPath)) {
  dotenv.config({ path: packageEnvPath });
} else {
  // Fallback to default location
  dotenv.config();
}

export interface DiscordConfig {
  botToken: string;
  clientId: string;
  guildId: string;
  publicKey?: string;
  apiBaseUrl?: string;
}

export interface GameApiConfig {
  baseUrl: string;
}

export interface AIConfig {
  openaiApiKey?: string;
  elizaUrl?: string;
  elizaApiKey?: string;
}

export function getDiscordConfig(): DiscordConfig {
  // Support both naming conventions
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;
  const guildId = process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID;

  if (!botToken || !clientId || !guildId) {
    throw new Error(
      'Missing required Discord environment variables. Need: DISCORD_BOT_TOKEN (or DISCORD_TOKEN), DISCORD_CLIENT_ID (or DISCORD_APPLICATION_ID), DISCORD_GUILD_ID (or DISCORD_SERVER_ID)'
    );
  }

  return {
    botToken,
    clientId,
    guildId,
    publicKey: process.env.DISCORD_PUBLIC_KEY,
    apiBaseUrl: process.env.DISCORD_API_BASE_URL || 'http://localhost:3000/api',
  };
}

export function getGameApiConfig(): GameApiConfig {
  return {
    baseUrl: process.env.DISCORD_API_BASE_URL || 'http://localhost:3000/api',
  };
}

export function getAIConfig(): AIConfig {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY,
    elizaUrl: process.env.ELIZA_URL,
    elizaApiKey: process.env.ELIZA_API_KEY,
  };
}
