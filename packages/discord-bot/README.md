# InnKeeper Discord Bot

Discord bot for the InnKeeper game community with AI concierge functionality, game API integration, and moderation features.

## Features

- **Two-Step Verification**: Human verification (anti-bot) + Wallet verification (NFT ownership)
- **Wallet Verification**: Verify wallet addresses to access server features (requires human verification first)
- **AI Concierge**: Answers questions about the game using AI and knowledge base
- **Game Integration**: Look up parties, runs, players, and heroes
- **Contract Information**: Get details about Monad contracts (Tavern Regulars, Town Posse, etc.)
- **Server Setup**: Automated server configuration with channels, roles, and permissions
- **Advanced Moderation**: Auto-moderation, spam detection, scam protection, warnings, timeouts, and logging
- **Safety Features**: Rate limiting, profanity filtering, link filtering, suspicious content detection

## Setup

### Prerequisites

1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot user and copy the bot token
3. Get your Discord server (guild) ID
4. Invite the bot to your server with these permissions:
   - Manage Channels
   - Manage Roles
   - Manage Messages
   - Kick Members
   - Ban Members
   - Moderate Members
   - Send Messages
   - Embed Links
   - Read Message History

### Environment Variables

Add these to your `.env` file:

```env
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_GUILD_ID=your-discord-server-id
DISCORD_API_BASE_URL=http://localhost:3000/api

# Optional: For AI concierge
OPENAI_API_KEY=your-openai-api-key
# OR
ELIZA_URL=http://localhost:3001
ELIZA_API_KEY=your-eliza-api-key
```

### Installation

```bash
# Install dependencies
pnpm install

# Build the bot
pnpm --filter @innkeeper/discord-bot build

# Start the bot
pnpm --filter @innkeeper/discord-bot start
```

## Usage

### Server Setup

Run the setup command in your Discord server (admin only):

```
/setup-server
```

This will create:
- **Channels**:
  - Entry Gate: start-here, rules, faq, support-unverified (everyone can see)
  - Wallet Verification: verify-wallet (requires Human Verified role)
  - Community: announcements, general, bot-commands, showcase (requires Verified role)
  - Game: game-help, party-finder, contract-info, trading, tavern-regulars, town-posse (requires Verified role)
  - Support: support, bug-reports, suggestions (requires Verified role)
  - Moderation: mod-logs, reports (moderator+ only)
- **Roles**: Admin, Moderator, Human Verified, Verified, Player, Tavern Regular, Town Posse, VIP, Bot

**Important:** After running `/setup-server`, you need to set up Wick Bot in the `#start-here` channel. Wick Bot includes captcha functionality, so no additional bots are needed. See `HUMAN_VERIFICATION_SETUP.md` for detailed instructions.

- **Permissions**:
  - Entry Gate channels: Everyone can view
  - Wallet Verification channels: Human Verified role required
  - All other channels: Verified role required (after wallet verification)
  - Role-restricted channels: Tavern Regulars, Town Posse
  - Moderation channels: Moderator+ only

### Verification Flow

1. **Human Verification** (Step 1): User completes captcha/verification in `#start-here` → Receives "Human Verified" role
2. **Wallet Verification** (Step 2): User runs `/verify [wallet]` in `#verify-wallet` → Receives "Verified" role if wallet owns NFTs

See `VERIFICATION_FLOW.md` for detailed flow documentation.

### Commands

#### Verification Commands
- `/verify [wallet]` - Verify your wallet address (requires Human Verified role first, then grants Verified role for full server access)

#### Information Commands
- `/help` - Show all available commands
- `/game-info [topic]` - Get information about the game

#### Contract Commands
- `/contract [name]` - Get contract information (e.g., "tavern regulars", "town posse", "cellar")

#### Player Commands
- `/player [wallet]` - Look up player stats and heroes

#### Party Commands
- `/party-info [id]` - Get party information
- `/run-info [id]` - Get run information

#### Moderation Commands (Moderator+)
- `/warn [user] [reason]` - Warn a user
- `/timeout [user] [duration] [reason]` - Timeout a user (in minutes)
- `/kick [user] [reason]` - Kick a user from the server

## Development

```bash
# Watch mode
pnpm --filter @innkeeper/discord-bot dev

# Run setup script directly
pnpm --filter @innkeeper/discord-bot setup
```

## Architecture

- `src/index.ts` - Main bot entry point
- `src/config.ts` - Configuration management
- `src/commands/` - Command handlers
- `src/services/` - Service layer (API clients, AI, moderation)
- `src/events/` - Event handlers
- `src/scripts/` - Setup and utility scripts

## Security

- Bot token stored in environment variables (never commit)
- Permission checks for all admin/mod commands
- Input validation for all user inputs
- Rate limiting on API calls
- Safe error handling (no token leakage)

## Deployment

The bot runs as a long-running Node.js process. It can be deployed:

- Alongside workers in the same container
- As a separate service/container
- On a VPS or cloud instance

The bot requires a persistent connection to the Discord gateway.
