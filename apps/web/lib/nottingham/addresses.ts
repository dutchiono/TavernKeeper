import { Address, isAddress, zeroAddress } from 'viem';
import { ROBINHOOD_MAINNET_ID, ROBINHOOD_TESTNET_ID, isRobinhoodMainnet } from './chain';

/**
 * Nottingham contract addresses.
 *
 * Env-driven rather than hardcoded per network, because the contracts are not deployed
 * yet and a stale literal in source is worse than a missing env var — the Monad
 * addresses.ts resolves its chain at *module load* into one of three frozen objects, so
 * every consumer silently gets whatever was baked in at import time. Reading from env
 * behind an explicit validity check avoids inheriting that failure mode.
 */
export interface NottinghamAddresses {
    NOTT_TOKEN: Address;
    SHERIFFS_OFFICE: Address;
    COFFERS: Address;
}

/**
 * @param raw address from env, or undefined
 * @returns the address, or the zero address if unset/malformed
 *
 * viem's `isAddress` validates the EIP-55 checksum by default, so a mis-cased address
 * (the form block explorers sometimes render) is rejected rather than silently used.
 */
function parseAddress(raw: string | undefined): Address {
    if (!raw || !isAddress(raw)) return zeroAddress;
    return raw as Address;
}

/**
 * NOTE: each env var must be referenced as a *literal* `process.env.NEXT_PUBLIC_X`.
 * Next.js inlines client-side env vars by static analysis at build time; a computed
 * lookup like `process.env[name]` is not rewritten, so it resolves to undefined in the
 * browser bundle and every address would silently read as the zero address.
 */
export const NOTTINGHAM_ADDRESSES: NottinghamAddresses = {
    NOTT_TOKEN: parseAddress(process.env.NEXT_PUBLIC_NOTT_TOKEN_ADDRESS),
    SHERIFFS_OFFICE: parseAddress(process.env.NEXT_PUBLIC_SHERIFFS_OFFICE_ADDRESS),
    COFFERS: parseAddress(process.env.NEXT_PUBLIC_COFFERS_ADDRESS),
};

export const NOTTINGHAM_CHAIN_ID = isRobinhoodMainnet
    ? ROBINHOOD_MAINNET_ID
    : ROBINHOOD_TESTNET_ID;

/** True once every Nottingham contract address is configured. */
export function isNottinghamDeployed(): boolean {
    return Object.values(NOTTINGHAM_ADDRESSES).every((a) => a !== zeroAddress);
}

/**
 * Addresses that are still unset. Call before any read/write path rather than letting a
 * zero-address call return empty data that reads as "the office is vacant".
 */
export function missingNottinghamAddresses(): string[] {
    return Object.entries(NOTTINGHAM_ADDRESSES)
        .filter(([, a]) => a === zeroAddress)
        .map(([k]) => k);
}

export function requireNottinghamDeployed(): void {
    const missing = missingNottinghamAddresses();
    if (missing.length > 0) {
        throw new Error(
            `Nottingham is not configured on chain ${NOTTINGHAM_CHAIN_ID}. ` +
            `Missing: ${missing.join(', ')}. ` +
            `Set NEXT_PUBLIC_<NAME>_ADDRESS after deploying.`
        );
    }
}
