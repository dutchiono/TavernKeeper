import { Address } from 'viem';

/**
 * Address Configuration:
 * - DEPLOYER_ADDRESS: Wallet receiving team/dev fees (5% from TavernKeeper, owner tax from groups)
 * - FEE_RECIPIENT_ADDRESS: Wallet receiving Inventory contract fees (loot claiming)
 * - TREASURY_ADDRESS: Wallet receiving 5% from group manager fees (TavernRegulars/TownPosse)
 * - THE_CELLAR: CellarHook contract receiving 15% from TavernKeeper Office fees (pot)
 */

// Monad Testnet Addresses
const MONAD_ADDRESSES = {
    // Infrastructure
    ERC6551_REGISTRY: '0xF53245E95FAc1286b42Fd2231018fd8e62c4B126' as Address,
    ERC6551_IMPLEMENTATION: '0x13400f8A9E3Cc2b973538acB6527E3425D2AaF6c' as Address,

    // Game Contracts (Proxies)
    KEEP_TOKEN: '0xe044814c9eD1e6442Af956a817c161192cBaE98F' as Address,
    INVENTORY: '0x777b17Bda9B9438e67bd155fEfC04Dc184F004C7' as Address,
    ADVENTURER: '0x67e27a22B64385e0110e69Dceae7d394D2C87B06' as Address,
    TAVERNKEEPER: '0x0F527785e39B22911946feDf580d87a4E00465f0' as Address,
    DUNGEON_GATEKEEPER: '0x1D3EDBa836caB11C26A186873abf0fFeB8bbaE63' as Address,

    // Treasury / Mechanics
    THE_CELLAR: '0xaB837301d12cDc4b97f1E910FC56C9179894d9cf' as Address,
    CELLAR_ZAP: '0x9C85258d9A00C01d00ded98065ea3840dF06f09c' as Address,
    POOL_MANAGER: '0x124dDf9BdD2DdaD012ef1D5bBd77c00F05C610DA' as Address,
    // Fee recipient from env (NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS), fallback to Cellar if not set
    FEE_RECIPIENT: (process.env.NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS as Address | undefined) || '0xaB837301d12cDc4b97f1E910FC56C9179894d9cf' as Address,

    // Group LP Management
    TAVERN_REGULARS_MANAGER: '0x0000000000000000000000000000000000000000' as Address,
    TOWN_POSSE_MANAGER: '0x0000000000000000000000000000000000000000' as Address,
};

// Localhost Addresses (populated by deployment script)
export const LOCALHOST_ADDRESSES = {
    // Infrastructure
    ERC6551_REGISTRY: '0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C' as Address,
    ERC6551_IMPLEMENTATION: '0x9B5980110654dcA57a449e2D6BEc36fE54123B0F' as Address,

    // Game Contracts (Proxies)
    KEEP_TOKEN: '0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6' as Address,
    INVENTORY: '0xd8c9C56b1ef231207bAd219A488244aD34576F92' as Address,
    ADVENTURER: '0x3015864FDE2401cB23454BC7D7CA048649C0dEfa' as Address,
    TAVERNKEEPER: '0x193C700Ff3A554597907e4eA894d4040f38287b7' as Address,
    DUNGEON_GATEKEEPER: '0x931Bf6DF5AC8d75b97Cb9cF0800F4C2831085c45' as Address,

    // Treasury / Mechanics
    THE_CELLAR: '0xC1D9e381dF88841b16e9d01f35802B0583638e07' as Address,
    CELLAR_ZAP: '0x974Ac7F80FAAc9Eeaec3B2873A23333db29C87b0' as Address,
    POOL_MANAGER: '0x8788E862023A49a77E8F27277a8b3F07B4E9A7d8' as Address,
    // Fee recipient from env (NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS), fallback to Cellar if not set
    FEE_RECIPIENT: (process.env.NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS as Address | undefined) || '0xC1D9e381dF88841b16e9d01f35802B0583638e07' as Address,

    // Group LP Management
    TAVERN_REGULARS_MANAGER: '0xE671CA8cDA72a70Ca4adb8BCfA03631FCfFe2cE8' as Address,
    TOWN_POSSE_MANAGER: '0xEa0F26c751b27504Df2D6D99Aa225e8f0D79Be58' as Address,
};

// Choose addresses based on USE_LOCALHOST flag
const USE_LOCALHOST = process.env.NEXT_PUBLIC_USE_LOCALHOST === 'true';

// CONTRACT_ADDRESSES switches between Monad and Localhost
export const CONTRACT_ADDRESSES = USE_LOCALHOST ? LOCALHOST_ADDRESSES : MONAD_ADDRESSES;

// Implementation Addresses (for reference/verification)
export const IMPLEMENTATION_ADDRESSES = {
    KEEP_TOKEN: '0x5EA8Edb99E9a070c8f4358e0904b7cE63e7d5866' as Address,
    INVENTORY: '0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6' as Address,
    ADVENTURER: '0x582bDC81df3c6c78B85D9409987Ab9885A24A2f6' as Address,
    TAVERNKEEPER: '0xA4f51633445AAb969a20b070212aC11F0e180601' as Address,
    THE_CELLAR: '0xCE16E1617e344A4786971e3fFD0009f15020C503' as Address, // CellarHook implementation
    CELLAR_ZAP: '0x3c25cCAfDb2448bB5Dc33818b37c3ECD8c10AfC3' as Address, // CellarZapV4 implementation
};
