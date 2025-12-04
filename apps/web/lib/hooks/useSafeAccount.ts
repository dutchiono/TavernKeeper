/**
 * Safe account hook that works in both web (Privy) and miniapp (Farcaster SDK) contexts
 *
 * - Web context: Uses Privy for wallet connection
 * - Miniapp context: Uses Farcaster SDK directly (no WagmiProvider needed)
 */

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import type { Address } from 'viem';
import { getFarcasterWalletAddress } from '../services/farcasterWallet';
import { isInFarcasterMiniapp } from '../utils/farcasterDetection';

export function useSafeAccount() {
    const privy = usePrivy();
    const isMiniapp = isInFarcasterMiniapp();
    const [farcasterAddress, setFarcasterAddress] = useState<Address | null>(null);
    const [farcasterConnected, setFarcasterConnected] = useState(false);

    // Fetch Farcaster wallet address when in miniapp
    useEffect(() => {
        if (!isMiniapp) {
            setFarcasterAddress(null);
            setFarcasterConnected(false);
            return;
        }

        const checkFarcasterWallet = async () => {
            try {
                const address = await getFarcasterWalletAddress();
                setFarcasterAddress(address);
                setFarcasterConnected(!!address);
            } catch (error) {
                console.debug('Farcaster wallet not available:', error);
                setFarcasterAddress(null);
                setFarcasterConnected(false);
            }
        };

        checkFarcasterWallet();
        // Poll for wallet connection changes
        const interval = setInterval(checkFarcasterWallet, 2000);
        return () => clearInterval(interval);
    }, [isMiniapp]);

    // Use Farcaster SDK in miniapp, Privy otherwise
    const address = isMiniapp && farcasterAddress ? farcasterAddress : privy.user?.wallet?.address;
    const authenticated = isMiniapp ? farcasterConnected : privy.authenticated;

    return {
        address,
        authenticated,
        isConnected: authenticated,
    };
}
