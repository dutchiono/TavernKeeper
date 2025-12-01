import { defineChain } from 'viem';

// Monad chain definition
export const monad = defineChain({
    id: parseInt(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || '10143'),
    name: 'Monad',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Monad Explorer',
            url: process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL || 'https://testnet-explorer.monad.xyz',
        },
    },
});
