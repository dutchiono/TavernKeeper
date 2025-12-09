/**
 * Dungeon Run Service
 * 
 * Orchestrates dungeon runs using all contribution systems.
 * Handles level-by-level generation, combat, traps, loot, and completion.
 */

import { supabase } from '../supabase';
import { ThemedDungeonGenerator } from '../../contributions/themed-dungeon-generation/code/index';
import type { ThemedDungeon, GeneratedRoom, RoomType } from '../../contributions/themed-dungeon-generation/code/types/dungeon-generation';
import { getAdventurer, getAdventurersByWallet, updateAdventurerStats, addXP, restoreAdventurer } from '../../contributions/adventurer-tracking/code/services/adventurerService';
import type { HeroIdentifier, AdventurerRecord } from '../../contributions/adventurer-tracking/code/types/adventurer-stats';
import { getEquippedItems, addItemToInventory } from '../../contributions/inventory-tracking/code/services/inventoryService';
import { initializeCombat, runCombat } from '../../contributions/combat-system/code/services/combatService';
import type { CombatResult } from '../../contributions/combat-system/code/types/combat';
import { resolveTrap } from '../../contributions/combat-system/code/services/trapService';
import type { TrapResolutionResult } from '../../contributions/combat-system/code/types/trap';
import { createMonsterInstanceByName, getMonsterStatBlock } from '../../contributions/monster-stat-blocks/code/services/monsterService';
import type { MonsterInstance } from '../../contributions/monster-stat-blocks/code/types/monster-stats';
import { ItemGenerator } from '../../contributions/procedural-item-generation/code/generators/item-generator';

const HERO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HERO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '143', 10);

export interface DungeonRunResult {
  runId: string;
  status: 'victory' | 'defeat' | 'error';
  levelsCompleted: number;
  totalXP: number;
  events: Array<{
    type: string;
    level: number;
    roomType: RoomType;
    description: string;
    timestamp: number;
  }>;
  finalPartyStats: AdventurerRecord[];
}

/**
 * Execute a dungeon run
 */
export async function executeDungeonRun(
  runId: string,
  dungeonId: string,
  party: string[],
  seed: string,
  walletAddress: string
): Promise<DungeonRunResult> {
  const events: DungeonRunResult['events'] = [];
  
  try {
    // 1. Load dungeon from database
    const { data: dungeonData, error: dungeonError } = await supabase
      .from('dungeons')
      .select('*')
      .eq('id', dungeonId)
      .single();

    if (dungeonError || !dungeonData) {
      throw new Error(`Dungeon ${dungeonId} not found`);
    }

    const dungeonMap = dungeonData.map as any;
    const dungeonSeed = dungeonData.seed || seed;

    // 2. Initialize dungeon generator and get structure
    const dungeonGenerator = new ThemedDungeonGenerator();
    // Reconstruct dungeon from stored data
    const dungeon: ThemedDungeon = {
      id: dungeonMap.id || dungeonId,
      name: dungeonMap.name || 'Unknown Dungeon',
      depth: dungeonMap.depth || 100,
      theme: dungeonMap.theme || { id: 'unknown', name: 'Unknown' },
      finalBoss: dungeonMap.finalBoss,
      midBosses: dungeonMap.midBosses || [],
      levelLayout: dungeonMap.levelLayout || [],
      provenance: dungeonMap.provenance,
    };

    // 3. Load party members with stats and equipment
    const partyMembers: AdventurerRecord[] = [];
    for (const tokenId of party) {
      const heroId: HeroIdentifier = {
        tokenId,
        contractAddress: HERO_CONTRACT_ADDRESS,
        chainId: CHAIN_ID,
      };

      const adventurer = await getAdventurer(heroId);
      if (!adventurer) {
        throw new Error(`Adventurer not found for hero ${tokenId}`);
      }

      partyMembers.push(adventurer);
    }

    // 4. Execute level-by-level
    let currentLevel = 1;
    let totalXP = 0;
    const maxLevel = Math.min(dungeon.depth, 100); // Cap at 100 levels for safety

    while (currentLevel <= maxLevel) {
      // Check if party is wiped
      const aliveMembers = partyMembers.filter(m => m.stats.health > 0);
      if (aliveMembers.length === 0) {
        events.push({
          type: 'party_wipe',
          level: currentLevel,
          roomType: 'combat',
          description: 'All party members have been defeated',
          timestamp: Date.now(),
        });
        break;
      }

      // Generate room for this level
      // Rooms are stored in levelLayout, but we may need to generate on-demand if not present
      let room: GeneratedRoom;
      try {
        room = dungeonGenerator.getRoomForLevel(dungeon, currentLevel);
      } catch (error) {
        // Room not pre-generated, generate on-demand
        const { RoomGenerator } = await import('../../contributions/themed-dungeon-generation/code/generators/room-generator');
        const roomGenerator = new RoomGenerator();
        const generatedRoom = roomGenerator.generateRoom({
          seed: `${dungeonSeed}-level-${currentLevel}`,
          level: currentLevel,
          dungeon,
        });
        room = generatedRoom;
      }

      // Execute room based on type
      const roomResult = await executeRoom(
        room,
        currentLevel,
        partyMembers,
        walletAddress,
        dungeonSeed
      );

      events.push(...roomResult.events);
      totalXP += roomResult.xpAwarded || 0;

      // Update party stats
      for (const update of roomResult.partyUpdates) {
        const member = partyMembers.find(m => 
          m.heroId.tokenId === update.heroId.tokenId
        );
        if (member) {
          const updated = await updateAdventurerStats({
            heroId: update.heroId,
            updates: update.updates,
            reason: update.reason,
          });
          // Update in-place
          const index = partyMembers.indexOf(member);
          partyMembers[index] = updated;
        }
      }

      // Award XP
      for (const xpUpdate of roomResult.xpUpdates) {
        const result = await addXP(xpUpdate.heroId, xpUpdate.xp);
        const member = partyMembers.find(m => 
          m.heroId.tokenId === xpUpdate.heroId.tokenId
        );
        if (member) {
          const index = partyMembers.indexOf(member);
          partyMembers[index] = result.adventurer;
        }
      }

      currentLevel++;
    }

    // 5. Determine final status
    const aliveMembers = partyMembers.filter(m => m.stats.health > 0);
    const status: 'victory' | 'defeat' = aliveMembers.length > 0 ? 'victory' : 'defeat';

    return {
      runId,
      status,
      levelsCompleted: currentLevel - 1,
      totalXP,
      events,
      finalPartyStats: partyMembers,
    };
  } catch (error) {
    console.error(`Error executing dungeon run ${runId}:`, error);
    return {
      runId,
      status: 'error',
      levelsCompleted: 0,
      totalXP: 0,
      events: [{
        type: 'error',
        level: 0,
        roomType: 'combat',
        description: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      }],
      finalPartyStats: [],
    };
  }
}

interface RoomExecutionResult {
  events: DungeonRunResult['events'];
  xpAwarded: number;
  partyUpdates: Array<{
    heroId: HeroIdentifier;
    updates: Partial<AdventurerRecord['stats']>;
    reason: string;
  }>;
  xpUpdates: Array<{
    heroId: HeroIdentifier;
    xp: number;
  }>;
}

/**
 * Execute a single room
 */
async function executeRoom(
  room: GeneratedRoom,
  level: number,
  partyMembers: AdventurerRecord[],
  walletAddress: string,
  dungeonSeed: string
): Promise<RoomExecutionResult> {
  const events: RoomExecutionResult['events'] = [];
  const partyUpdates: RoomExecutionResult['partyUpdates'] = [];
  const xpUpdates: RoomExecutionResult['xpUpdates'] = [];
  let xpAwarded = 0;

  const roomType = room.room.type;
  const encounter = room.encounter;

  events.push({
    type: 'room_enter',
    level,
    roomType,
    description: `Entered ${room.room.name}: ${room.room.description}`,
    timestamp: Date.now(),
  });

  switch (roomType) {
    case 'combat':
    case 'boss':
    case 'mid_boss': {
      // Combat encounter
      if (!encounter) {
        events.push({
          type: 'room_empty',
          level,
          roomType,
          description: 'Room appears empty',
          timestamp: Date.now(),
        });
        break;
      }

      // Get monsters for encounter
      const monsters: MonsterInstance[] = [];
      if (encounter.type === 'combat') {
        // Regular combat - generate monsters based on theme/difficulty
        const monsterCount = Math.min(encounter.difficulty || 1, 4); // Max 4 monsters
        for (let i = 0; i < monsterCount; i++) {
          // TODO: Get monster from theme - for now use placeholder
          const monster = createMonsterInstanceByName('Skeleton');
          if (monster) {
            monsters.push(monster);
          }
        }
      } else if (roomType === 'boss' || roomType === 'mid_boss') {
        // Boss encounter - use boss from dungeon
        // TODO: Convert boss to monster instance
      }

      if (monsters.length === 0) {
        events.push({
          type: 'combat_skipped',
          level,
          roomType,
          description: 'No monsters found',
          timestamp: Date.now(),
        });
        break;
      }

      // Initialize combat
      const combatState = initializeCombat(
        partyMembers,
        monsters,
        `room-${level}`,
        false, // Not ambush
        {
          clericHealRatio: 0.3,
          mageMagicRatio: 0.7,
        }
      );

      // Run combat
      const combatResult: CombatResult = await runCombat(combatState, {
        clericHealRatio: 0.3,
        mageMagicRatio: 0.7,
      });

      events.push({
        type: combatResult.status === 'victory' ? 'combat_victory' : 'combat_defeat',
        level,
        roomType,
        description: combatResult.status === 'victory' 
          ? `Defeated ${monsters.length} monster(s)`
          : 'Party was defeated',
        timestamp: Date.now(),
      });

      // Update party HP
      for (const partyMember of combatResult.updatedPartyMembers) {
        partyUpdates.push({
          heroId: partyMember.heroId,
          updates: {
            health: partyMember.currentHp,
            mana: partyMember.currentMana,
          },
          reason: 'combat',
        });
      }

      // Award XP on victory
      if (combatResult.status === 'victory' && combatResult.xpAwarded) {
        xpAwarded = combatResult.xpAwarded;
        const xpPerMember = Math.floor(xpAwarded / partyMembers.length);
        for (const member of partyMembers) {
          xpUpdates.push({
            heroId: member.heroId,
            xp: xpPerMember,
          });
        }
      }

      break;
    }

    case 'trap': {
      // Trap encounter
      if (!encounter || encounter.type !== 'trap') {
        break;
      }

      const trapResult: TrapResolutionResult = resolveTrap(
        encounter,
        `room-${level}`,
        level,
        partyMembers
      );

      events.push({
        type: trapResult.status === 'success' ? 'trap_disarmed' : 'trap_triggered',
        level,
        roomType,
        description: trapResult.status === 'success'
          ? 'Trap was successfully disarmed'
          : `Trap triggered! ${trapResult.damageDealt} damage dealt`,
        timestamp: Date.now(),
      });

      // Apply damage
      if (trapResult.damageDealt > 0) {
        for (const member of trapResult.updatedPartyMembers) {
          partyUpdates.push({
            heroId: member.heroId,
            updates: {
              health: member.stats.health,
            },
            reason: 'trap_damage',
          });
        }
      }

      // Award XP
      if (trapResult.xpAwarded) {
        xpAwarded = trapResult.xpAwarded;
        const xpPerMember = Math.floor(xpAwarded / partyMembers.length);
        for (const member of partyMembers) {
          xpUpdates.push({
            heroId: member.heroId,
            xp: xpPerMember,
          });
        }
      }

      break;
    }

    case 'treasure': {
      // Treasure room - generate loot
      const itemGenerator = new ItemGenerator(`${dungeonSeed}-treasure-${level}`);
      const loot = itemGenerator.generateItem({
        context: 'dungeon_loot',
        level,
        classPreference: 'any',
        rarityModifier: 100 + (level * 2), // Slightly better loot at deeper levels
      });

      // Add to inventory
      await addItemToInventory(walletAddress, loot, 1, 'dungeon_loot');

      events.push({
        type: 'treasure_found',
        level,
        roomType,
        description: `Found ${loot.name} (${loot.rarity})`,
        timestamp: Date.now(),
      });

      break;
    }

    case 'safe': {
      // Safe room - restore HP/mana
      for (const member of partyMembers) {
        const restored = await restoreAdventurer(member.heroId, {
          restoreHealth: true,
          restoreMana: true,
        });
        partyUpdates.push({
          heroId: member.heroId,
          updates: {
            health: restored.stats.health,
            mana: restored.stats.mana,
          },
          reason: 'rest',
        });
      }

      events.push({
        type: 'rest',
        level,
        roomType,
        description: 'Party rested and recovered',
        timestamp: Date.now(),
      });

      break;
    }

    default:
      events.push({
        type: 'room_explored',
        level,
        roomType,
        description: 'Room explored',
        timestamp: Date.now(),
      });
  }

  return {
    events,
    xpAwarded,
    partyUpdates,
    xpUpdates,
  };
}

