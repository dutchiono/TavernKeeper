// FEATURE FLAGS - TavernKeeper / Nottingham
// Control which features are enabled/disabled in the application
// Modified: 2026-02-16 - Disabled token economy to focus on core gameplay
// Modified: 2026-07-20 - Made per-chain so Nottingham can ship its token economy
//                        while Monad's stays dark

export type ChainKey = 'monad' | 'nottingham';

export interface FeatureSet {
    // Token economy
    tokens: boolean;        // token functionality
    staking: boolean;       // token staking features
    cellar: boolean;        // Cellar / Coffers liquidity + treasury features
    marketplace: boolean;   // token-based marketplace
    office: boolean;        // the Office / Sheriff's Office king-of-the-hill mechanic

    // Core game
    heroes: boolean;
    dungeons: boolean;
    inventory: boolean;
    agents: boolean;
    parties: boolean;
}

/**
 * Monad — token economy stays disabled.
 *
 * The KEEP economy was deliberately paused (see TOKEN_ECONOMY_DISABLED.md) to focus on
 * dungeon gameplay, and the deployed contracts carry the balance problems Nottingham was
 * built to fix. Nothing here should be re-enabled without revisiting that.
 */
const MONAD_FEATURES: FeatureSet = {
    tokens: false,
    staking: false,
    cellar: false,
    marketplace: false,
    office: false,

    heroes: true,
    dungeons: true,
    inventory: true,
    agents: true,
    parties: true,
};

/**
 * Nottingham — the token economy is the product.
 *
 * Staking and marketplace stay off: neither has a Nottingham implementation, and a flag
 * that is on without a contract behind it is worse than one that is off.
 */
const NOTTINGHAM_FEATURES: FeatureSet = {
    tokens: true,
    staking: false,
    cellar: true,
    marketplace: false,
    office: true,

    heroes: false,
    dungeons: false,
    inventory: false,
    agents: false,
    parties: false,
};

export const CHAIN_FEATURES: Record<ChainKey, FeatureSet> = {
    monad: MONAD_FEATURES,
    nottingham: NOTTINGHAM_FEATURES,
};

export const DEFAULT_CHAIN: ChainKey =
    (process.env.NEXT_PUBLIC_ACTIVE_CHAIN as ChainKey) || 'monad';

/**
 * Back-compat: the flat object existing call sites import. Resolves to the active chain,
 * defaulting to Monad so nothing changes for the current app.
 */
export const FEATURE_FLAGS: FeatureSet = CHAIN_FEATURES[DEFAULT_CHAIN] ?? MONAD_FEATURES;

export type FeatureFlag = keyof FeatureSet;

export function isFeatureEnabled(feature: FeatureFlag, chain: ChainKey = DEFAULT_CHAIN): boolean {
    return (CHAIN_FEATURES[chain] ?? MONAD_FEATURES)[feature];
}

export function requireFeature(feature: FeatureFlag, chain: ChainKey = DEFAULT_CHAIN): void {
    if (!isFeatureEnabled(feature, chain)) {
        throw new Error(`Feature "${feature}" is currently disabled on ${chain}`);
    }
}
