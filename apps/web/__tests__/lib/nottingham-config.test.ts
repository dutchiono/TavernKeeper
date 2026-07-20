import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * These modules read env at import time, so each case must reset the module registry and
 * re-import. That import-time resolution is exactly the pattern that makes the Monad
 * addresses.ts hard to work with; here it is at least contained and covered.
 */
const ENV_KEYS = [
    'NEXT_PUBLIC_ROBINHOOD_CHAIN_ID',
    'NEXT_PUBLIC_ROBINHOOD_RPC_URL',
    'NEXT_PUBLIC_ALCHEMY_API_KEY',
    'ALCHEMY_API_KEY',
    'NEXT_PUBLIC_NOTT_TOKEN_ADDRESS',
    'NEXT_PUBLIC_SHERIFFS_OFFICE_ADDRESS',
    'NEXT_PUBLIC_COFFERS_ADDRESS',
    'NEXT_PUBLIC_ACTIVE_CHAIN',
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) {
        saved[k] = process.env[k];
        delete process.env[k];
    }
    vi.resetModules();
});

afterEach(() => {
    for (const k of ENV_KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
    }
});

describe('Nottingham chain config', () => {
    it('defaults to Robinhood testnet, not mainnet', async () => {
        const { robinhood, ROBINHOOD_TESTNET_ID, isRobinhoodMainnet } = await import(
            '../../lib/nottingham/chain'
        );

        // The Monad setup defaulted the app to mainnet while hardhat defaulted to testnet
        // off the same env var. Both default to testnet here.
        expect(robinhood.id).toBe(ROBINHOOD_TESTNET_ID);
        expect(robinhood.id).toBe(46630);
        expect(isRobinhoodMainnet).toBe(false);
        expect(robinhood.testnet).toBe(true);
    });

    it('switches to mainnet only when explicitly opted in', async () => {
        process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID = '4663';
        const { robinhood, isRobinhoodMainnet } = await import('../../lib/nottingham/chain');

        expect(robinhood.id).toBe(4663);
        expect(isRobinhoodMainnet).toBe(true);
        expect(robinhood.testnet).toBe(false);
    });

    it('uses ETH as the native currency, not MON', async () => {
        const { robinhood } = await import('../../lib/nottingham/chain');
        expect(robinhood.nativeCurrency.symbol).toBe('ETH');
        expect(robinhood.nativeCurrency.decimals).toBe(18);
    });

    it('prefers Alchemy over an explicit RPC override', async () => {
        process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-key';
        process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL = 'https://example.invalid';
        const { getRobinhoodRpcUrl } = await import('../../lib/nottingham/chain');

        expect(getRobinhoodRpcUrl()).toBe(
            'https://robinhood-testnet.g.alchemy.com/v2/test-key'
        );
    });

    it('falls back to the explicit override, then the public endpoint', async () => {
        process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL = 'https://my-node.example';
        let mod = await import('../../lib/nottingham/chain');
        expect(mod.getRobinhoodRpcUrl()).toBe('https://my-node.example');

        delete process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL;
        vi.resetModules();
        mod = await import('../../lib/nottingham/chain');
        expect(mod.getRobinhoodRpcUrl()).toBe('https://rpc.testnet.chain.robinhood.com');
    });

    it('points the explorer at the matching network', async () => {
        let mod = await import('../../lib/nottingham/chain');
        expect(mod.getRobinhoodExplorerUrl()).toBe(
            'https://explorer.testnet.chain.robinhood.com'
        );

        process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID = '4663';
        vi.resetModules();
        mod = await import('../../lib/nottingham/chain');
        expect(mod.getRobinhoodExplorerUrl()).toBe('https://robinhoodchain.blockscout.com');
    });
});

describe('Nottingham addresses', () => {
    it('reports undeployed rather than silently returning zero addresses', async () => {
        const { isNottinghamDeployed, missingNottinghamAddresses } = await import(
            '../../lib/nottingham/addresses'
        );

        expect(isNottinghamDeployed()).toBe(false);
        expect(missingNottinghamAddresses()).toEqual([
            'NOTT_TOKEN',
            'SHERIFFS_OFFICE',
            'COFFERS',
        ]);
    });

    it('throws with the missing names rather than calling a zero address', async () => {
        const { requireNottinghamDeployed } = await import('../../lib/nottingham/addresses');

        // A zero-address read returns empty data, which would render as "office vacant"
        // instead of "not configured". Fail loudly instead.
        expect(() => requireNottinghamDeployed()).toThrow(/SHERIFFS_OFFICE/);
    });

    it('rejects a malformed address instead of trusting env', async () => {
        process.env.NEXT_PUBLIC_NOTT_TOKEN_ADDRESS = 'not-an-address';
        const { NOTTINGHAM_ADDRESSES } = await import('../../lib/nottingham/addresses');

        expect(NOTTINGHAM_ADDRESSES.NOTT_TOKEN).toBe(
            '0x0000000000000000000000000000000000000000'
        );
    });

    it('rejects a mis-checksummed address', async () => {
        // Real case: a block explorer rendered NVDA's address with a lowercase final
        // character. viem's isAddress validates EIP-55, so it is refused rather than used.
        process.env.NEXT_PUBLIC_NOTT_TOKEN_ADDRESS =
            '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEc';
        const { NOTTINGHAM_ADDRESSES } = await import('../../lib/nottingham/addresses');

        expect(NOTTINGHAM_ADDRESSES.NOTT_TOKEN).toBe(
            '0x0000000000000000000000000000000000000000'
        );
    });

    it('reports deployed once every address is set', async () => {
        process.env.NEXT_PUBLIC_NOTT_TOKEN_ADDRESS =
            '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9';
        process.env.NEXT_PUBLIC_SHERIFFS_OFFICE_ADDRESS =
            '0x322F0929c4625eD5bAd873c95208D54E1c003b2d';
        process.env.NEXT_PUBLIC_COFFERS_ADDRESS =
            '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC';

        const { isNottinghamDeployed, missingNottinghamAddresses, requireNottinghamDeployed } =
            await import('../../lib/nottingham/addresses');

        expect(isNottinghamDeployed()).toBe(true);
        expect(missingNottinghamAddresses()).toEqual([]);
        expect(() => requireNottinghamDeployed()).not.toThrow();
    });
});

describe('per-chain feature flags', () => {
    it('keeps the Monad token economy disabled', async () => {
        const { CHAIN_FEATURES } = await import('../../lib/feature-flags');

        expect(CHAIN_FEATURES.monad.tokens).toBe(false);
        expect(CHAIN_FEATURES.monad.cellar).toBe(false);
        expect(CHAIN_FEATURES.monad.staking).toBe(false);
        expect(CHAIN_FEATURES.monad.office).toBe(false);
    });

    it('enables the token economy on Nottingham', async () => {
        const { CHAIN_FEATURES } = await import('../../lib/feature-flags');

        expect(CHAIN_FEATURES.nottingham.tokens).toBe(true);
        expect(CHAIN_FEATURES.nottingham.office).toBe(true);
        expect(CHAIN_FEATURES.nottingham.cellar).toBe(true);
    });

    it('leaves flags off where no Nottingham implementation exists', async () => {
        const { CHAIN_FEATURES } = await import('../../lib/feature-flags');

        // A flag that is on without a contract behind it is worse than one that is off.
        expect(CHAIN_FEATURES.nottingham.staking).toBe(false);
        expect(CHAIN_FEATURES.nottingham.marketplace).toBe(false);
        expect(CHAIN_FEATURES.nottingham.dungeons).toBe(false);
    });

    it('defaults the flat FEATURE_FLAGS export to Monad for back-compat', async () => {
        const { FEATURE_FLAGS, DEFAULT_CHAIN } = await import('../../lib/feature-flags');

        // The two existing consumers read FEATURE_FLAGS.staking / .cellar directly.
        expect(DEFAULT_CHAIN).toBe('monad');
        expect(FEATURE_FLAGS.staking).toBe(false);
        expect(FEATURE_FLAGS.cellar).toBe(false);
    });

    it('follows NEXT_PUBLIC_ACTIVE_CHAIN when set', async () => {
        process.env.NEXT_PUBLIC_ACTIVE_CHAIN = 'nottingham';
        const { FEATURE_FLAGS, isFeatureEnabled } = await import('../../lib/feature-flags');

        expect(FEATURE_FLAGS.office).toBe(true);
        expect(isFeatureEnabled('tokens')).toBe(true);
        expect(isFeatureEnabled('tokens', 'monad')).toBe(false);
    });

    it('requireFeature names the chain in its error', async () => {
        const { requireFeature } = await import('../../lib/feature-flags');
        expect(() => requireFeature('office', 'monad')).toThrow(/monad/);
        expect(() => requireFeature('office', 'nottingham')).not.toThrow();
    });
});
