import { Client, GuildMember, TextChannel } from 'discord.js';
import { GameApiService } from './game-api';

interface VerificationData {
  userId: string;
  walletAddress: string;
  verifiedAt: Date;
  heroCount?: number;
}

export class VerificationService {
  private client: Client;
  private gameApi: GameApiService;
  private verifiedUsers: Map<string, VerificationData> = new Map();

  constructor(client: Client) {
    this.client = client;
    this.gameApi = new GameApiService();
  }

  async verifyWallet(
    member: GuildMember,
    walletAddress: string
  ): Promise<{ success: boolean; message: string; heroCount?: number }> {
    // Check if user has completed human verification first
    const humanVerifiedRole = member.guild.roles.cache.find(
      (r) => r.name === 'Human Verified' || r.name.toLowerCase().includes('human verified')
    );

    if (!humanVerifiedRole || !member.roles.cache.has(humanVerifiedRole.id)) {
      return {
        success: false,
        message: '❌ Please complete human verification first! Go to `#start-here` and complete the Wick Bot verification button (captcha is built-in). You need the "Human Verified" role before you can verify your wallet.',
      };
    }

    // Validate wallet format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return {
        success: false,
        message: 'Invalid wallet address format. Please provide a valid Ethereum/Monad address (0x...).',
      };
    }

    try {
      // Check if user owns any heroes
      const heroes = await this.gameApi.getPlayerHeroes(walletAddress);
      const heroCount = heroes.length;

      if (heroCount === 0) {
        return {
          success: false,
          message: 'No heroes found for this wallet address. You need to own at least one Adventurer NFT to verify.',
        };
      }

      // Store verification data
      this.verifiedUsers.set(member.id, {
        userId: member.id,
        walletAddress,
        verifiedAt: new Date(),
        heroCount,
      });

      // Assign verified role
      const verifiedRole = member.guild.roles.cache.find((r) => r.name === 'Verified');
      const playerRole = member.guild.roles.cache.find((r) => r.name === 'Player');

      if (verifiedRole) {
        await member.roles.add(verifiedRole);
      }

      if (playerRole && !member.roles.cache.has(playerRole.id)) {
        await member.roles.add(playerRole);
      }

      return {
        success: true,
        message: `✅ Verification successful! Found ${heroCount} hero${heroCount > 1 ? 'es' : ''} for wallet \`${walletAddress}\`.`,
        heroCount,
      };
    } catch (error) {
      console.error('Error verifying wallet:', error);
      return {
        success: false,
        message: 'Error verifying wallet. Please try again later.',
      };
    }
  }

  isVerified(userId: string): boolean {
    return this.verifiedUsers.has(userId);
  }

  getVerificationData(userId: string): VerificationData | undefined {
    return this.verifiedUsers.get(userId);
  }

  async sendVerificationInstructions(channel: TextChannel): Promise<void> {
    await channel.send({
      content: `# 🔐 Wallet Verification

To access all server features, you need to verify your wallet address.

## How to Verify

1. **Own an Adventurer NFT**: You must own at least one Adventurer NFT hero
2. **Use the verification command**: \`/verify [wallet-address]\`
3. **Get verified**: Once verified, you'll receive the **Verified** role and access to all channels

## Example

\`/verify 0x1234567890123456789012345678901234567890\`

## Benefits

✅ Access to all game channels
✅ Ability to join parties
✅ Participate in Regulars and Town Posse groups
✅ Full server access

## Need Help?

If you don't have a hero yet, check out the game to mint one!`,
    });
  }
}
