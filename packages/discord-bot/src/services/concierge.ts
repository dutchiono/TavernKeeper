import OpenAI from 'openai';
import { getAIConfig } from '../config';
import { GameApiService } from './game-api';

interface ConciergeContext {
  question: string;
  userId?: string;
  channelId?: string;
}

export class ConciergeService {
  private openai: OpenAI | null = null;
  private gameApi: GameApiService;
  private knowledgeBase: string;

  constructor() {
    const aiConfig = getAIConfig();
    this.gameApi = new GameApiService();

    // Initialize OpenAI if API key is available
    if (aiConfig.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: aiConfig.openaiApiKey,
      });
    }

    // Build knowledge base from game documentation
    this.knowledgeBase = this.buildKnowledgeBase();
  }

  private buildKnowledgeBase(): string {
    return `
# InnKeeper Game Knowledge Base

## Game Overview
InnKeeper is a dungeon crawler game built on the Monad blockchain. Players form parties with NFT heroes to explore dungeons, battle monsters, and earn rewards.

## Core Concepts

### Heroes
- Heroes are ERC-721 NFTs (Adventurer contract)
- Each hero has unique attributes and metadata
- Heroes can be equipped with items from the Inventory contract
- Heroes are used to form parties for dungeon runs

### Parties
- Parties consist of up to 5 heroes
- Players can create parties and invite others
- Parties can start dungeon runs together
- Party status: waiting, ready, in_progress, completed, cancelled

### Dungeon Runs
- Players form parties and enter dungeons
- Runs are deterministic and use seeded RNG
- Results: victory, defeat, timeout, abandoned, error
- Runs generate events and logs that can be reviewed

### Contracts

#### Tavern Regulars Manager
- Small groups (3-10 members)
- Pool liquidity together for shared LP positions
- Fee distribution: 80% to members, 20% to Cellar pot
- 1% contribution tax when adding liquidity
- No group treasury - all fees go to members or pot

#### Town Posse Manager
- Large groups (10-100+ members)
- Tiered membership system (Bronze/Silver/Gold)
- Governance mechanisms for proposals and voting
- Fee distribution: 75% to members, 20% to pot, 5% to treasury
- 1% contribution tax when adding liquidity

#### The Cellar
- Central pot that receives contributions
- Players can contribute MON tokens to the pot
- Pot grows from group contributions and fees
- Used for various game mechanics

### Blockchain
- Built on Monad blockchain (testnet)
- Uses ERC-6551 for Token Bound Accounts (TBAs)
- Contracts are UUPS upgradeable proxies
- Native token: MON

### Game Mechanics
- Deterministic game engine with seeded PRNG
- Turn-based combat system
- Spatial movement and exploration
- Objective-based dungeon progression
- Agent-driven NPCs using ElizaOS

## Common Questions

Q: How do I get started?
A: You need to mint or acquire an Adventurer NFT hero. Then you can create or join a party to start dungeon runs.

Q: What are Tavern Regulars?
A: Tavern Regulars are small groups (3-10 members) that pool liquidity together. They share LP positions and distribute fees among members.

Q: What are Town Posse groups?
A: Town Posse groups are larger communities (10-100+ members) with tiered membership and governance features.

Q: How do parties work?
A: Create a party with your hero, invite others, and once you have up to 5 heroes, you can start a dungeon run.

Q: What happens in a dungeon run?
A: Your party explores the dungeon, encounters monsters, solves puzzles, and tries to complete objectives. The run is deterministic and uses seeded RNG.

Q: How do I check my heroes?
A: Use the /player command with your wallet address to see your owned heroes.

Q: How do I find a party?
A: Use the party-finder channel or create your own party and invite others.
`;
  }

  async answerQuestion(context: ConciergeContext): Promise<string> {
    const { question } = context;

    // Check if question is about specific game data (party, run, player)
    if (this.isDataQuery(question)) {
      return await this.handleDataQuery(question);
    }

    // Use AI if available
    if (this.openai) {
      return await this.answerWithAI(question);
    }

    // Fallback to keyword matching
    return this.answerWithKeywords(question);
  }

  private isDataQuery(question: string): boolean {
    const lowerQuestion = question.toLowerCase();
    return (
      lowerQuestion.includes('party') ||
      lowerQuestion.includes('run') ||
      lowerQuestion.includes('hero') ||
      lowerQuestion.includes('player') ||
      lowerQuestion.includes('wallet')
    );
  }

  private async handleDataQuery(question: string): Promise<string> {
    // Extract IDs or addresses from question
    const partyIdMatch = question.match(/party[:\s]+([a-zA-Z0-9-]+)/i);
    const runIdMatch = question.match(/run[:\s]+([a-zA-Z0-9-]+)/i);
    const walletMatch = question.match(/0x[a-fA-F0-9]{40}/);

    if (partyIdMatch) {
      const partyId = partyIdMatch[1];
      const party = await this.gameApi.getPartyStatus(partyId);
      if (!party) {
        return `Party ${partyId} not found.`;
      }
      return this.formatPartyInfo(party);
    }

    if (runIdMatch) {
      const runId = runIdMatch[1];
      const run = await this.gameApi.getRunInfo(runId);
      if (!run) {
        return `Run ${runId} not found.`;
      }
      return this.formatRunInfo(run);
    }

    if (walletMatch) {
      const wallet = walletMatch[0];
      const heroes = await this.gameApi.getPlayerHeroes(wallet);
      if (heroes.length === 0) {
        return `No heroes found for wallet ${wallet}.`;
      }
      return this.formatPlayerHeroes(wallet, heroes);
    }

    return "I can help you look up party, run, or player information. Try asking about a specific party ID, run ID, or wallet address.";
  }

  private formatPartyInfo(party: any): string {
    const statusEmoji = {
      waiting: '⏳',
      ready: '✅',
      in_progress: '🎮',
      completed: '🏆',
      cancelled: '❌',
    };

    return `
**Party Information**
**ID:** ${party.id}
**Status:** ${statusEmoji[party.status as keyof typeof statusEmoji] || '❓'} ${party.status}
**Members:** ${party.memberCount}/${party.max_members || 5}
**Owner:** ${party.owner_id}
${party.runId ? `**Current Run:** ${party.runId}` : ''}
${party.members?.length > 0 ? `\n**Members:**\n${party.members.map((m: any) => `- Hero ${m.hero_token_id}`).join('\n')}` : ''}
`;
  }

  private formatRunInfo(run: any): string {
    const resultEmoji = {
      victory: '🏆',
      defeat: '💀',
      timeout: '⏱️',
      abandoned: '🚪',
      error: '❌',
    };

    return `
**Run Information**
**ID:** ${run.id}
**Status:** ${run.result ? resultEmoji[run.result as keyof typeof resultEmoji] || '❓' : '🔄 In Progress'}
${run.result ? `**Result:** ${run.result}` : ''}
**Started:** <t:${Math.floor(new Date(run.start_time).getTime() / 1000)}:R>
${run.end_time ? `**Ended:** <t:${Math.floor(new Date(run.end_time).getTime() / 1000)}:R>` : ''}
${run.dungeon ? `**Dungeon:** ${run.dungeon.name}` : ''}
${run.events?.length > 0 ? `**Events:** ${run.events.length} events recorded` : ''}
`;
  }

  private formatPlayerHeroes(wallet: string, heroes: any[]): string {
    return `
**Player Heroes**
**Wallet:** ${wallet}
**Hero Count:** ${heroes.length}

${heroes.slice(0, 10).map((hero, idx) => `**${idx + 1}.** Hero #${hero.tokenId || hero.id || 'Unknown'}`).join('\n')}
${heroes.length > 10 ? `\n... and ${heroes.length - 10} more heroes` : ''}
`;
  }

  private async answerWithAI(question: string): Promise<string> {
    if (!this.openai) {
      return this.answerWithKeywords(question);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are the TavernKeeper, a wise and friendly innkeeper and dungeon master in InnKeeper, a dungeon crawler game on the Monad blockchain. You guide adventurers, answer questions about the game, and help them understand the world. You speak in character as a knowledgeable tavern keeper who has seen many adventurers come and go. Be conversational, helpful, and in-character. Use the following knowledge base to answer questions accurately:\n\n${this.knowledgeBase}\n\nRespond as the TavernKeeper character - friendly, knowledgeable, and encouraging. If you don't know something, say so in character.`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return this.answerWithKeywords(question);
    }
  }

  private answerWithKeywords(question: string): string {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('tavern regular')) {
      return `**Tavern Regulars** are small groups (3-10 members) that pool liquidity together. They share LP positions and distribute fees: 80% to members, 20% to the Cellar pot. There's a 1% contribution tax when adding liquidity.`;
    }

    if (lowerQuestion.includes('town posse')) {
      return `**Town Posse** groups are larger communities (10-100+ members) with tiered membership (Bronze/Silver/Gold) and governance features. Fee distribution: 75% to members, 20% to pot, 5% to treasury.`;
    }

    if (lowerQuestion.includes('party') || lowerQuestion.includes('how to play')) {
      return `**Parties** are groups of up to 5 heroes that explore dungeons together. Create a party with your hero, invite others, and start a dungeon run once you have enough members.`;
    }

    if (lowerQuestion.includes('hero') || lowerQuestion.includes('nft')) {
      return `**Heroes** are ERC-721 NFTs from the Adventurer contract. Each hero has unique attributes and can be equipped with items. You need heroes to form parties and play the game.`;
    }

    if (lowerQuestion.includes('cellar')) {
      return `**The Cellar** is the central pot that receives contributions from players and groups. It grows from group contributions and fees, and is used for various game mechanics.`;
    }

    return `I can help you with information about InnKeeper! Try asking about:
- Tavern Regulars or Town Posse groups
- How to create parties
- Hero NFTs
- Dungeon runs
- Contract information

Or use commands like /party-info, /run-info, or /player to look up specific game data.`;
  }
}
