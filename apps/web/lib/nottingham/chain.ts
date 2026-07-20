import { defineChain } from 'viem';

/**
 * Robinhood Chain — Arbitrum L2 on Ethereum, ETH for gas.
 *
 * Deliberately mirrors packages/contracts-nottingham/hardhat.config.ts, including the
 * testnet default. The Monad setup defaulted chains.ts to mainnet (143) while
 * hardhat.config.ts defaulted to testnet (10143) off the *same* env var, which is how a
 * deploy ends up on the wrong network. Here both default to testnet and mainnet must be
 * opted into explicitly.
 */
export const ROBINHOOD_MAINNET_ID = 4663;
export const ROBINHOOD_TESTNET_ID = 46630;

const CHAIN_ID = parseInt(
    process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID || String(ROBINHOOD_TESTNET_ID),
    10
);

export const isRobinhoodMainnet = CHAIN_ID === ROBINHOOD_MAINNET_ID;

export function getRobinhoodRpcUrl(): string {
    // PRIORITY 1: Alchemy, Robinhood's recommended provider.
    const alchemyApiKey =
        process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
    if (alchemyApiKey) {
        return isRobinhoodMainnet
            ? `https://robinhood-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
            : `https://robinhood-testnet.g.alchemy.com/v2/${alchemyApiKey}`;
    }

    // PRIORITY 2: explicit override.
    if (process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL) {
        return process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL;
    }

    // PRIORITY 3: public endpoint — rate limited, fine for reads, not for production.
    if (typeof window !== 'undefined') {
        console.warn(
            'Nottingham: no NEXT_PUBLIC_ALCHEMY_API_KEY or NEXT_PUBLIC_ROBINHOOD_RPC_URL set. ' +
            'Falling back to the public endpoint, which is rate limited.'
        );
    }
    return isRobinhoodMainnet
        ? 'https://rpc.mainnet.chain.robinhood.com'
        : 'https://rpc.testnet.chain.robinhood.com';
}

export function getRobinhoodExplorerUrl(): string {
    return isRobinhoodMainnet
        ? 'https://robinhoodchain.blockscout.com'
        : 'https://explorer.testnet.chain.robinhood.com';
}

export const robinhood = defineChain({
    id: CHAIN_ID,
    name: isRobinhoodMainnet ? 'Robinhood Chain' : 'Robinhood Chain Testnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: [getRobinhoodRpcUrl()] },
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: getRobinhoodExplorerUrl(),
        },
    },
    testnet: !isRobinhoodMainnet,
});
