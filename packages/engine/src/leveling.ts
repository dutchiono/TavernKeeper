import type { Entity, EntityStats } from '@innkeeper/lib';
import { getAbilityModifier } from '@innkeeper/lib';

/**
 * Extended entity stats with leveling
 */
export interface LeveledEntityStats extends EntityStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface LeveledEntity extends Omit<Entity, 'stats'> {
  stats: LeveledEntityStats;
}

/**
 * XP curve - exponential growth
 * Level 1->2: 100 XP
 * Level 2->3: 200 XP
 * Level 3->4: 400 XP
 * etc.
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Formula: 100 * 2^(level-2)
  return Math.floor(100 * Math.pow(2, level - 2));
}

/**
 * Calculate total XP needed to reach a level
 */
export function getTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

/**
 * Calculate XP reward based on defeated enemy
 * Based on enemy's max HP and stats
 */
export function calculateXpGain(defeatedEnemy: Entity): number {
  const { maxHp, ac, attackBonus } = defeatedEnemy.stats;
  
  // Base XP from HP (10 XP per point of max HP)
  let xp = maxHp * 10;
  
  // Bonus XP for high AC (5 XP per point above 10)
  if (ac > 10) {
    xp += (ac - 10) * 5;
  }
  
  // Bonus XP for high attack bonus (10 XP per point above 0)
  if (attackBonus > 0) {
    xp += attackBonus * 10;
  }
  
  // Boss multiplier (if enemy has very high HP, assume it's a boss)
  if (maxHp > 100) {
    xp = Math.floor(xp * 2);
  }
  
  return Math.max(10, xp); // Minimum 10 XP
}

/**
 * Award XP to an entity
 */
export function awardXp(entity: LeveledEntity, amount: number): LeveledEntity {
  const newXp = entity.stats.xp + amount;
  const currentLevel = entity.stats.level;
  
  let updatedEntity = {
    ...entity,
    stats: {
      ...entity.stats,
      xp: newXp,
    },
  };
  
  // Check for level ups (can level multiple times if enough XP)
  while (updatedEntity.stats.xp >= updatedEntity.stats.xpToNextLevel && updatedEntity.stats.level < 20) {
    updatedEntity = levelUp(updatedEntity);
  }
  
  return updatedEntity;
}

/**
 * Check if entity can level up
 */
export function canLevelUp(entity: LeveledEntity): boolean {
  return entity.stats.xp >= entity.stats.xpToNextLevel && entity.stats.level < 20;
}

/**
 * Level up an entity
 */
export function levelUp(entity: LeveledEntity): LeveledEntity {
  const newLevel = entity.stats.level + 1;
  
  if (newLevel > 20) {
    return entity; // Max level reached
  }
  
  // Calculate stat increases
  const conModifier = getAbilityModifier(entity.stats.con);
  const hpIncrease = Math.max(1, 6 + conModifier); // d6 + CON modifier per level (fighter-like)
  
  // Every 4 levels, increase a primary stat
  const statIncrease = newLevel % 4 === 0 ? 1 : 0;
  
  const newMaxHp = entity.stats.maxHp + hpIncrease;
  const newXpToNextLevel = getXpForLevel(newLevel + 1);
  
  return {
    ...entity,
    stats: {
      ...entity.stats,
      level: newLevel,
      xpToNextLevel: newXpToNextLevel,
      maxHp: newMaxHp,
      hp: newMaxHp, // Full heal on level up
      // Increase primary stat every 4 levels
      str: entity.stats.str + (statIncrease && entity.stats.str >= entity.stats.dex ? 1 : 0),
      dex: entity.stats.dex + (statIncrease && entity.stats.dex > entity.stats.str ? 1 : 0),
      // Attack bonus increases every 5 levels
      attackBonus: entity.stats.attackBonus + (newLevel % 5 === 0 ? 1 : 0),
    },
  };
}

/**
 * Initialize leveling stats for an existing entity
 */
export function initializeLeveledEntity(entity: Entity, startLevel: number = 1): LeveledEntity {
  const xpToNextLevel = getXpForLevel(startLevel + 1);
  
  return {
    ...entity,
    stats: {
      ...entity.stats,
      level: startLevel,
      xp: getTotalXpForLevel(startLevel),
      xpToNextLevel,
    },
  };
}

/**
 * Get level progress percentage (0-100)
 */
export function getLevelProgress(entity: LeveledEntity): number {
  const currentLevelXp = getTotalXpForLevel(entity.stats.level);
  const nextLevelXp = getTotalXpForLevel(entity.stats.level + 1);
  const xpIntoLevel = entity.stats.xp - currentLevelXp;
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  
  if (xpNeededForLevel === 0) return 100;
  
  return Math.floor((xpIntoLevel / xpNeededForLevel) * 100);
}

/**
 * Get stat increase summary for a level
 */
export function getStatIncreases(fromLevel: number, toLevel: number): {
  hp: number;
  str: number;
  dex: number;
  attackBonus: number;
} {
  let hpIncrease = 0;
  let strIncrease = 0;
  let dexIncrease = 0;
  let attackBonusIncrease = 0;
  
  for (let level = fromLevel + 1; level <= toLevel; level++) {
    hpIncrease += 6; // Average HP gain (could factor in CON)
    
    if (level % 4 === 0) {
      strIncrease += 1; // Simplified - in reality would depend on class
    }
    
    if (level % 5 === 0) {
      attackBonusIncrease += 1;
    }
  }
  
  return {
    hp: hpIncrease,
    str: strIncrease,
    dex: dexIncrease,
    attackBonus: attackBonusIncrease,
  };
}

/**
 * Calculate recommended level for enemy based on stats
 */
export function estimateEnemyLevel(entity: Entity): number {
  const { maxHp, ac, attackBonus } = entity.stats;
  
  // Rough estimation based on HP and stats
  let estimatedLevel = Math.floor(maxHp / 10);
  
  // Adjust based on AC (higher AC = higher level)
  if (ac > 15) estimatedLevel += 2;
  else if (ac > 12) estimatedLevel += 1;
  
  // Adjust based on attack bonus
  estimatedLevel += Math.floor(attackBonus / 2);
  
  return Math.max(1, Math.min(20, estimatedLevel));
}

/**
 * Create XP sharing calculation for party
 */
export function distributeXp(totalXp: number, partySize: number): number {
  // Simple equal distribution (could be more complex with level scaling)
  return Math.floor(totalXp / partySize);
}

/**
 * Create a level table reference
 */
export function generateLevelTable(): Array<{ level: number; xpRequired: number; xpTotal: number }> {
  const table = [];
  for (let level = 1; level <= 20; level++) {
    table.push({
      level,
      xpRequired: getXpForLevel(level),
      xpTotal: getTotalXpForLevel(level),
    });
  }
  return table;
}
