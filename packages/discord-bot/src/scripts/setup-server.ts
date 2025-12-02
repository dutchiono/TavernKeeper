import {
  CategoryChannel,
  ChannelType,
  Guild,
  PermissionFlagsBits,
  Role,
  TextChannel,
} from 'discord.js';

interface ChannelConfig {
  name: string;
  type: ChannelType;
  topic?: string;
  permissions?: Array<{
    id: string | Role;
    allow?: bigint;
    deny?: bigint;
  }>;
}

interface RoleConfig {
  name: string;
  color?: number;
  permissions?: bigint;
  mentionable?: boolean;
}

export async function setupServer(guild: Guild) {
  console.log(`Setting up server: ${guild.name}`);

  // Create roles first
  const roles = await createRoles(guild);
  console.log('Created roles');

  // Create channels
  await createChannels(guild, roles);
  console.log('Created channels');

  console.log('Server setup complete!');
}

async function createRoles(guild: Guild): Promise<Map<string, Role>> {
  const roleConfigs: RoleConfig[] = [
    {
      name: 'Admin',
      color: 0xff0000,
      permissions: PermissionFlagsBits.Administrator,
      mentionable: false,
    },
    {
      name: 'Moderator',
      color: 0xffa500,
      permissions:
        PermissionFlagsBits.ManageMessages |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.ModerateMembers |
        PermissionFlagsBits.ViewChannel |
        PermissionFlagsBits.ManageRoles,
      mentionable: false,
    },
    {
      name: 'Wick Bot',
      color: 0x7289da,
      permissions:
        PermissionFlagsBits.ViewChannel |
        PermissionFlagsBits.SendMessages |
        PermissionFlagsBits.ManageRoles |
        PermissionFlagsBits.ManageChannels |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.BanMembers,
      mentionable: false,
    },
    {
      name: 'Human Verified',
      color: 0x00d4ff,
      permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
      mentionable: false,
    },
    {
      name: 'Verified',
      color: 0x00ff00,
      permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
      mentionable: false,
    },
    {
      name: 'Player',
      color: 0x5865f2,
      permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
      mentionable: true,
    },
    {
      name: 'Regular',
      color: 0x8b4513,
      permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
      mentionable: true,
    },
    {
      name: 'Town Posse',
      color: 0xffd700,
      permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
      mentionable: true,
    },
    {
      name: 'VIP',
      color: 0x9b59b6,
      permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
      mentionable: true,
    },
    {
      name: 'Bot',
      color: 0x808080,
      permissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
      mentionable: false,
    },
  ];

  const createdRoles = new Map<string, Role>();

  for (const config of roleConfigs) {
    // Check if role already exists
    let role = guild.roles.cache.find((r) => r.name === config.name);

    if (!role) {
      role = await guild.roles.create({
        name: config.name,
        color: config.color,
        permissions: config.permissions,
        mentionable: config.mentionable ?? false,
        reason: 'Server setup automation',
      });
      console.log(`Created role: ${config.name}`);
    } else {
      console.log(`Role already exists: ${config.name}`);
    }

    createdRoles.set(config.name, role);
  }

  return createdRoles;
}

async function createChannels(guild: Guild, roles: Map<string, Role>) {
  // Create Entry Gate category (first thing new members see)
  let entryGateCategory = guild.channels.cache.find(
    (ch) => ch.name === '🛡️ Entry Gate' && ch.type === ChannelType.GuildCategory
  ) as CategoryChannel | undefined;

  if (!entryGateCategory) {
    entryGateCategory = await guild.channels.create({
      name: '🛡️ Entry Gate',
      type: ChannelType.GuildCategory,
      position: 0, // Place at top
    });
  }

  // Create category for game channels
  let gameCategory = guild.channels.cache.find(
    (ch) => ch.name === '🎮 Game' && ch.type === ChannelType.GuildCategory
  ) as CategoryChannel | undefined;

  if (!gameCategory) {
    gameCategory = await guild.channels.create({
      name: '🎮 Game',
      type: ChannelType.GuildCategory,
    });
  }

  // Create category for community channels
  let communityCategory = guild.channels.cache.find(
    (ch) => ch.name === '💬 Community' && ch.type === ChannelType.GuildCategory
  ) as CategoryChannel | undefined;

  if (!communityCategory) {
    communityCategory = await guild.channels.create({
      name: '💬 Community',
      type: ChannelType.GuildCategory,
    });
  }

  // Create category for moderation
  let modCategory = guild.channels.cache.find(
    (ch) => ch.name === '🛡️ Moderation' && ch.type === ChannelType.GuildCategory
  ) as CategoryChannel | undefined;

  if (!modCategory) {
    modCategory = await guild.channels.create({
      name: '🛡️ Moderation',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Moderator')!.id,
          allow: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Admin')!.id,
          allow: PermissionFlagsBits.ViewChannel,
        },
      ],
    });
  }

  // Create wallet verification category (requires human verification first)
  let walletVerificationCategory = guild.channels.cache.find(
    (ch) => ch.name === '🔐 Wallet Verification' && ch.type === ChannelType.GuildCategory
  ) as CategoryChannel | undefined;

  if (!walletVerificationCategory) {
    walletVerificationCategory = await guild.channels.create({
      name: '🔐 Wallet Verification',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Human Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
        {
          id: roles.get('Admin')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    });
  }

  // Create support category
  let supportCategory = guild.channels.cache.find(
    (ch) => ch.name === '💬 Support' && ch.type === ChannelType.GuildCategory
  ) as CategoryChannel | undefined;

  if (!supportCategory) {
    supportCategory = await guild.channels.create({
      name: '💬 Support',
      type: ChannelType.GuildCategory,
    });
  }

  const channelConfigs: Array<ChannelConfig & { category?: CategoryChannel }> = [
    // Entry Gate channels (everyone can see - first step)
    {
      name: 'start-here',
      type: ChannelType.GuildText,
      category: entryGateCategory,
      topic: '👋 Start here! Complete human verification to continue.',
      permissions: [
        {
          id: guild.roles.everyone.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory,
          deny: PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'rules',
      type: ChannelType.GuildText,
      category: entryGateCategory,
      topic: 'Server rules and guidelines',
      permissions: [
        {
          id: guild.roles.everyone.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory,
          deny: PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'faq',
      type: ChannelType.GuildText,
      category: entryGateCategory,
      topic: 'Frequently asked questions',
      permissions: [
        {
          id: guild.roles.everyone.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory,
          deny: PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'support-unverified',
      type: ChannelType.GuildText,
      category: entryGateCategory,
      topic: 'Get help if you have issues with verification',
      permissions: [
        {
          id: guild.roles.everyone.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    // Wallet Verification channels (requires Human Verified role)
    {
      name: 'verify-wallet',
      type: ChannelType.GuildText,
      category: walletVerificationCategory,
      topic: 'Verify your wallet address here using /verify command (requires human verification first)',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Human Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
        {
          id: roles.get('Admin')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    // Community channels (require wallet verification - "Verified" role)
    {
      name: 'announcements',
      type: ChannelType.GuildText,
      category: communityCategory,
      topic: 'Server announcements and updates',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory,
          deny: PermissionFlagsBits.SendMessages,
        },
        {
          id: roles.get('Admin')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'general',
      type: ChannelType.GuildText,
      category: communityCategory,
      topic: 'General discussion about InnKeeper',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'bot-commands',
      type: ChannelType.GuildText,
      category: communityCategory,
      topic: 'Use bot commands here',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'showcase',
      type: ChannelType.GuildText,
      category: communityCategory,
      topic: 'Show off your heroes, runs, and achievements!',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    // Game channels (require verification)
    {
      name: 'game-help',
      type: ChannelType.GuildText,
      category: gameCategory,
      topic: 'Ask questions about the game - the bot concierge will help!',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'party-finder',
      type: ChannelType.GuildText,
      category: gameCategory,
      topic: 'Find party members for dungeon runs',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'contract-info',
      type: ChannelType.GuildText,
      category: gameCategory,
      topic: 'Discuss contracts, Tavern Regulars, Town Posse, and blockchain topics',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'trading',
      type: ChannelType.GuildText,
      category: gameCategory,
      topic: 'Trade heroes, items, and discuss marketplace',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'regulars',
      type: ChannelType.GuildText,
      category: gameCategory,
      topic: 'Regulars group discussions',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Regular')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
        {
          id: roles.get('Admin')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'town-posse',
      type: ChannelType.GuildText,
      category: gameCategory,
      topic: 'Town Posse group discussions',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Town Posse')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
        {
          id: roles.get('Admin')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    // Support channels
    {
      name: 'support',
      type: ChannelType.GuildText,
      category: supportCategory,
      topic: 'Get help from moderators and community',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
        {
          id: roles.get('Moderator')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'bug-reports',
      type: ChannelType.GuildText,
      category: supportCategory,
      topic: 'Report bugs and issues',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    {
      name: 'suggestions',
      type: ChannelType.GuildText,
      category: supportCategory,
      topic: 'Suggest new features and improvements',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Verified')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
    // Moderation channels
    {
      name: 'mod-logs',
      type: ChannelType.GuildText,
      category: modCategory,
      topic: 'Moderation action logs',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Moderator')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory,
        },
        {
          id: roles.get('Admin')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory,
        },
      ],
    },
    {
      name: 'reports',
      type: ChannelType.GuildText,
      category: modCategory,
      topic: 'User reports and appeals',
      permissions: [
        {
          id: guild.roles.everyone.id,
          deny: PermissionFlagsBits.ViewChannel,
        },
        {
          id: roles.get('Moderator')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
        {
          id: roles.get('Admin')!.id,
          allow: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
        },
      ],
    },
  ];

  for (const config of channelConfigs) {
    // Check if channel already exists
    const existingChannel = guild.channels.cache.find(
      (ch) => ch.name === config.name && ch.type === config.type
    );

    if (!existingChannel) {
      const channelOptions: any = {
        name: config.name,
        type: config.type,
        topic: config.topic,
        parent: config.category,
        permissionOverwrites: config.permissions || [],
        reason: 'Server setup automation',
      };
      await guild.channels.create(channelOptions);
      console.log(`Created channel: ${config.name}`);
    } else {
      console.log(`Channel already exists: ${config.name}`);
    }
  }

  // Create start-here message in start-here channel
  const startHereChannel = guild.channels.cache.find(
    (ch) => ch.name === 'start-here' && ch.isTextBased()
  ) as TextChannel | undefined;

  if (startHereChannel) {
    const existingMessages = await startHereChannel.messages.fetch({ limit: 1 });
    if (existingMessages.size === 0) {
      await startHereChannel.send({
        content: `# Welcome to InnKeeper! 🎮

Welcome to the InnKeeper Discord server! A dungeon crawler game built on the Monad blockchain.

## 🛡️ Step 1: Human Verification

**First, verify you're human:**
1. Look for the verification button below (from Wick Bot - captcha is built-in)
2. Complete the captcha/verification process
3. You'll receive the **Human Verified** role

## 🔐 Step 2: Wallet Verification

**After human verification, verify your wallet:**
1. Go to \`#verify-wallet\` channel (unlocks after Step 1)
2. Use: \`/verify [your-wallet-address]\`
3. Must own at least one Adventurer NFT hero
4. You'll receive the **Verified** role and full server access

## Getting Started

1. **Get a Hero**: Mint or acquire an Adventurer NFT
2. **Human Verify**: Complete verification in this channel
3. **Wallet Verify**: Verify wallet in \`#verify-wallet\`
4. **Join a Party**: Use \`#party-finder\`
5. **Start Playing**: Form parties and run dungeons!

## Quick Links

📜 Read \`#rules\` | ❓ Check \`#faq\` | 🆘 Need help? \`#support-unverified\`

**Note:** If you don't see a verification button, ask a moderator in \`#support-unverified\` to set up Wick Bot (captcha is built-in).

Good luck in the dungeons! 🗡️`,
      });
    }
  }

  // Create rules message
  const rulesChannel = guild.channels.cache.find(
    (ch) => ch.name === 'rules' && ch.isTextBased()
  ) as TextChannel | undefined;

  if (rulesChannel) {
    const existingMessages = await rulesChannel.messages.fetch({ limit: 1 });
    if (existingMessages.size === 0) {
      await rulesChannel.send({
        content: `# 📜 Server Rules

## General Rules

1. **Be Respectful** - Treat all members with respect
2. **No Harassment** - Harassment, bullying, or hate speech not tolerated
3. **No Spam** - Don't spam messages, emojis, or links
4. **Stay On Topic** - Keep discussions relevant to InnKeeper
5. **No Self-Promotion** - Excessive advertising not allowed
6. **No NSFW** - Keep content appropriate for all ages
7. **No Personal Info** - Don't share personal information
8. **Follow Discord ToS** - All Discord Terms of Service apply

## Verification Rules

**Two-Step Verification Process:**

1. **Human Verification** (Required First)
   - Complete captcha/verification in \`#start-here\`
   - Prevents bot accounts from accessing server
   - Gives you "Human Verified" role

2. **Wallet Verification** (Required Second)
   - After human verification, go to \`#verify-wallet\`
   - Use \`/verify [wallet-address]\` command
   - Must own at least one Adventurer NFT hero
   - One wallet per Discord account
   - Verification is permanent

## Moderation

- Moderators have final say
- Appeals in \`#reports\`
- Auto-moderation active (spam, links, scams)
- Repeated violations = permanent ban

## Consequences

**Warning** → **Timeout** (1hr-1wk) → **Kick** → **Ban**

By participating, you agree to follow these rules.`,
      });
    }
  }
}
