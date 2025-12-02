# Discord Server Setup Guide

This guide will help you set up your Discord server for InnKeeper.

## Step 1: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "InnKeeper Bot" (or your preferred name)
4. Go to the "Bot" section
5. Click "Add Bot"
6. Copy the bot token (you'll need this for `DISCORD_BOT_TOKEN`)
7. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent

## Step 2: Get Your Server ID

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your server name
3. Click "Copy Server ID"
4. Use this for `DISCORD_GUILD_ID`

## Step 3: Get Client ID

1. In your Discord application, go to "General Information"
2. Copy the "Application ID"
3. Use this for `DISCORD_CLIENT_ID`

## Step 4: Invite Bot to Server

Use this URL (replace `YOUR_CLIENT_ID` with your actual client ID):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Or use the OAuth2 URL Generator in the Discord Developer Portal:
- Scopes: `bot`, `applications.commands`
- Bot Permissions:
  - Manage Channels
  - Manage Roles
  - Manage Messages
  - Kick Members
  - Ban Members
  - Moderate Members
  - Send Messages
  - Embed Links
  - Read Message History
  - Use Slash Commands

## Step 5: Configure Environment Variables

Add to your `.env` file:

```env
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_GUILD_ID=your-server-id-here
DISCORD_API_BASE_URL=http://localhost:3000/api
```

## Step 6: Start the Bot

```bash
pnpm --filter @innkeeper/discord-bot start
```

## Step 7: Run Server Setup

Once the bot is online, run in your Discord server:

```
/setup-server
```

This will create all channels and roles automatically.

## Manual Setup (Alternative)

If you prefer to set up manually:

### Create Roles

1. **Admin** (Red color, Administrator permission)
2. **Moderator** (Orange color, Manage Messages, Kick/Ban Members)
3. **Player** (Blue color, default member role)
4. **Tavern Regular** (Brown color, for Tavern Regulars members)
5. **Town Posse** (Gold color, for Town Posse members)
6. **Bot** (Gray color, for bots)

### Create Channels

#### Community Category
- `#welcome` - Welcome channel (read-only for members)
- `#announcements` - Announcements (read-only for members)
- `#general` - General discussion
- `#bot-commands` - Bot commands

#### Game Category
- `#game-help` - Game questions (bot concierge active)
- `#party-finder` - Find party members
- `#contract-info` - Contract/blockchain discussions
- `#tavern-regulars` - Tavern Regulars discussions (role-restricted)
- `#town-posse` - Town Posse discussions (role-restricted)

#### Moderation Category (Hidden)
- `#mod-logs` - Moderation logs (moderator+ only)

### Set Permissions

- **@everyone**: Read messages in public channels
- **@Player**: Send messages in public channels
- **@Moderator**: Manage messages, kick/ban, view mod logs
- **@Admin**: Full permissions
- **Private channels**: Restrict to appropriate roles

## Troubleshooting

### Bot doesn't respond to commands
- Make sure the bot is online (green status)
- Check that you've enabled Message Content Intent
- Verify the bot has "Use Slash Commands" permission

### Setup command doesn't work
- Make sure you're an administrator
- Check bot has "Manage Channels" and "Manage Roles" permissions

### Bot can't see messages
- Enable "Message Content Intent" in Discord Developer Portal
- Restart the bot after enabling

### Commands not showing up
- Wait a few minutes for Discord to sync commands
- Try restarting the bot
- Check that `DISCORD_GUILD_ID` is set correctly
