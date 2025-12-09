import { defineChain } from 'viem';

// Monad chain definition
const USE_LOCALHOST = process.env.NEXT_PUBLIC_USE_LOCALHOST === 'true';
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || '143');

// Get RPC URL - prioritize Alchemy if API key is provided
export function getRpcUrl(): string {
    if (USE_LOCALHOST) {
        return 'http://127.0.0.1:8545';
    }

    // PRIORITY 1: Use Alchemy if API key is provided (highest priority to avoid rate limits)
    const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
    if (alchemyApiKey) {
        if (CHAIN_ID === 143) {
            return `https://monad-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
        } else {
            return `https://monad-testnet.g.alchemy.com/v2/${alchemyApiKey}`;
        }
    }

    // PRIORITY 2: If explicit RPC URL is set, use it (but warn if it's the public rate-limited URL)
    if (process.env.NEXT_PUBLIC_MONAD_RPC_URL) {
        const explicitUrl = process.env.NEXT_PUBLIC_MONAD_RPC_URL;
        const isPublicRpc = explicitUrl.includes('rpc.monad.xyz') || explicitUrl.includes('testnet-rpc.monad.xyz');
        if (isPublicRpc && typeof window !== 'undefined') {
            console.warn('⚠️ Using public RPC endpoint. This will hit rate limits. Set NEXT_PUBLIC_ALCHEMY_API_KEY to use Alchemy instead.');
        }
        return explicitUrl;
    }

    // PRIORITY 3: Fallback to free RPC (deprecated - will hit rate limits)
    if (typeof window !== 'undefined') {
        console.error('❌ No Alchemy API key found and no explicit RPC URL set. Using public RPC which will hit rate limits. Set NEXT_PUBLIC_ALCHEMY_API_KEY to fix this.');
    }
    return CHAIN_ID === 143 ? 'https://rpc.monad.xyz' : 'https://testnet-rpc.monad.xyz';
}

// Monad chain definition
export const monad = defineChain({
    id: CHAIN_ID,
    name: USE_LOCALHOST ? 'Monad Local' : (CHAIN_ID === 143 ? 'Monad Mainnet' : 'Monad Testnet'),
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [getRpcUrl()],
        },
    },
    blockExplorers: {
        default: {
            name: 'Monad Explorer',
            url: process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL || 'https://testnet-explorer.monad.xyz',
        },
    },
});
