import { createConfig, fallback, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { robinhood, getRobinhoodRpcUrl } from './chain';

/**
 * Wagmi config for Nottingham on Robinhood Chain.
 *
 * NOTE: the existing Monad wagmi configs (lib/wagmi-unified.ts, lib/wagmi-miniapp.ts) are
 * currently orphaned — `UnifiedWeb3Provider` is the only thing that mounts WagmiProvider
 * and it is never rendered, so app/layout.tsx has no provider above the components using
 * wagmi hooks. Anything consuming this config must mount a provider itself.
 */
export const nottinghamWagmiConfig = createConfig({
    chains: [robinhood],
    connectors: [injected()],
    transports: {
        [robinhood.id]: fallback([
            http(getRobinhoodRpcUrl()),
            // Public endpoint as a read fallback only; rate limited.
            http(
                robinhood.testnet
                    ? 'https://rpc.testnet.chain.robinhood.com'
                    : 'https://rpc.mainnet.chain.robinhood.com'
            ),
        ]),
    },
    ssr: true,
});
