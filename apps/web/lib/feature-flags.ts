// FEATURE FLAGS - TavernKeeper
// Control which features are enabled/disabled in the application
// Modified: 2026-02-16 - Disabled token economy to focus on core gameplay

export const FEATURE_FLAGS = {
  // TOKEN ECONOMY - DISABLED
  // User decided to focus on core dungeon gameplay rather than tokenomics
  tokens: false,           // KEEP/MON token functionality
  staking: false,          // Token staking features
  cellar: false,           // Cellar liquidity/treasury features  
  marketplace: false,      // Token-based marketplace (if applicable)
  
  // CORE GAME FEATURES - ENABLED
  heroes: true,            // Hero NFTs (Adventurer.sol)
  dungeons: true,          // Dungeon gameplay
  inventory: true,         // Item management
  agents: true,            // AI agent gameplay
  parties: true,           // Party management
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return FEATURE_FLAGS[feature];
}

export function requireFeature(feature: FeatureFlag): void {
  if (!FEATURE_FLAGS[feature]) {
    throw new Error(`Feature "${feature}" is currently disabled`);
  }
}