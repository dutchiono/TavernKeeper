import {
  Client,
  GuildMember,
  Message,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';

interface Warning {
  userId: string;
  count: number;
  lastWarning: Date;
}

interface RateLimitEntry {
  userId: string;
  count: number;
  resetAt: Date;
}

export class ModerationService {
  private client: Client;
  private warnings: Map<string, Warning> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private spamPatterns: RegExp[] = [
    /(.)\1{10,}/, // Repeated characters
    /(.)\1{5,}/g, // Multiple repeated characters
  ];

  // Profanity filter (basic - can be enhanced)
  private profanityWords: Set<string> = new Set([
    // Add common profanity words here if needed
    // Keeping it minimal for now - can be expanded
  ]);

  // Suspicious patterns (scams, phishing, etc.)
  private suspiciousPatterns: RegExp[] = [
    /discord\.gg\/[a-zA-Z0-9]+/gi, // Discord invite links
    /free.*nitro/gi, // Free nitro scams
    /steam.*gift/gi, // Steam gift scams
    /click.*here.*win/gi, // Phishing attempts
  ];

  constructor(client: Client) {
    this.client = client;
  }

  async checkMessage(message: Message): Promise<{
    shouldDelete: boolean;
    reason?: string;
    shouldWarn: boolean;
  }> {
    const content = message.content.toLowerCase();
    const authorId = message.author.id;

    // Check for spam
    if (this.isSpam(content)) {
      return {
        shouldDelete: true,
        reason: 'Spam detected',
        shouldWarn: true,
      };
    }

    // Check for profanity
    if (this.containsProfanity(content)) {
      return {
        shouldDelete: true,
        reason: 'Inappropriate language',
        shouldWarn: true,
      };
    }

    // Check rate limiting
    if (this.isRateLimited(authorId)) {
      return {
        shouldDelete: true,
        reason: 'Rate limit exceeded',
        shouldWarn: false,
      };
    }

    // Check for excessive links
    const linkCount = (content.match(/https?:\/\//g) || []).length;
    if (linkCount > 3) {
      return {
        shouldDelete: true,
        reason: 'Too many links',
        shouldWarn: true,
      };
    }

    // Check for suspicious patterns (scams, phishing)
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(message.content)) {
        return {
          shouldDelete: true,
          reason: 'Suspicious content detected',
          shouldWarn: true,
        };
      }
    }

    // Check for @everyone or @here mentions (spam prevention)
    if (content.includes('@everyone') || content.includes('@here')) {
      // Only warn if user doesn't have permission to mention
      if (!message.member?.permissions.has(PermissionFlagsBits.MentionEveryone)) {
        return {
          shouldDelete: true,
          reason: 'Unauthorized mention',
          shouldWarn: true,
        };
      }
    }

    return { shouldDelete: false, shouldWarn: false };
  }

  private isSpam(content: string): boolean {
    // Check for repeated characters
    for (const pattern of this.spamPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (content.length > 10 && capsRatio > 0.7) {
      return true;
    }

    return false;
  }

  private containsProfanity(content: string): boolean {
    const words = content.split(/\s+/);
    return words.some((word) => this.profanityWords.has(word));
  }

  private isRateLimited(userId: string): boolean {
    const now = new Date();
    const entry = this.rateLimits.get(userId);

    if (!entry) {
      this.rateLimits.set(userId, {
        userId,
        count: 1,
        resetAt: new Date(now.getTime() + 60000), // 1 minute window
      });
      return false;
    }

    if (now > entry.resetAt) {
      // Reset window
      entry.count = 1;
      entry.resetAt = new Date(now.getTime() + 60000);
      return false;
    }

    entry.count++;
    return entry.count > 10; // Max 10 messages per minute
  }

  async addWarning(userId: string): Promise<number> {
    const warning = this.warnings.get(userId) || {
      userId,
      count: 0,
      lastWarning: new Date(0),
    };

    warning.count++;
    warning.lastWarning = new Date();
    this.warnings.set(userId, warning);

    return warning.count;
  }

  getWarningCount(userId: string): number {
    return this.warnings.get(userId)?.count || 0;
  }

  async timeoutMember(
    member: GuildMember,
    durationMinutes: number,
    reason: string
  ): Promise<boolean> {
    try {
      if (!member.moderatable) {
        return false;
      }

      const timeoutUntil = Date.now() + durationMinutes * 60 * 1000;
      await member.timeout(timeoutUntil, reason);
      return true;
    } catch (error) {
      console.error('Error timing out member:', error);
      return false;
    }
  }

  async kickMember(member: GuildMember, reason: string): Promise<boolean> {
    try {
      if (!member.kickable) {
        return false;
      }

      await member.kick(reason);
      return true;
    } catch (error) {
      console.error('Error kicking member:', error);
      return false;
    }
  }

  async banMember(member: GuildMember, reason: string, days: number = 0): Promise<boolean> {
    try {
      if (!member.bannable) {
        return false;
      }

      await member.ban({ reason, deleteMessageDays: days });
      return true;
    } catch (error) {
      console.error('Error banning member:', error);
      return false;
    }
  }

  async logModAction(
    guildId: string,
    action: string,
    target: string,
    moderator: string,
    reason?: string
  ): Promise<void> {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const modLogChannel = guild.channels.cache.find(
        (ch) => ch.name === 'mod-logs' && ch.isTextBased()
      ) as TextChannel | undefined;

      if (modLogChannel) {
        await modLogChannel.send({
          content: `**${action}**\n**Target:** <@${target}>\n**Moderator:** <@${moderator}>${reason ? `\n**Reason:** ${reason}` : ''}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        });
      }
    } catch (error) {
      console.error('Error logging mod action:', error);
    }
  }

  hasModPermission(member: GuildMember): boolean {
    return (
      member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      member.permissions.has(PermissionFlagsBits.Administrator)
    );
  }

  hasAdminPermission(member: GuildMember): boolean {
    return member.permissions.has(PermissionFlagsBits.Administrator);
  }
}
