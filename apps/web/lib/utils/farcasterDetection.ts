/**
 * Farcaster Miniapp Detection Utility
 *
 * Detects if the app is running inside a Farcaster miniapp context
 * to switch between warplet (Farcaster's built-in wallet) and
 * regular browser wallets (MetaMask, WalletConnect, etc.)
 */

import sdk from '@farcaster/miniapp-sdk';

/**
 * Checks if the app is running inside a Farcaster miniapp (synchronous check)
 * Uses heuristics for immediate checks, but async check is more reliable
 * @returns true if running in Farcaster miniapp context
 */
export function isInFarcasterMiniapp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if we're in an iframe (miniapp context)
  const isInIframe = window.parent !== window;

  // Check for Farcaster-specific signals
  const hasFarcasterSDK = typeof (window as any).farcaster !== 'undefined';
  const isWarpcastUA = navigator.userAgent.includes('Warpcast');

  return isInIframe && (hasFarcasterSDK || isWarpcastUA);
}

/**
 * Async check using SDK's isInMiniApp method (more reliable)
 * @returns Promise<boolean> true if running in Farcaster miniapp context
 */
export async function checkIsInFarcasterMiniapp(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Use SDK's built-in method if available
    if (sdk && typeof sdk.isInMiniApp === 'function') {
      return await sdk.isInMiniApp();
    }
    // Fallback to synchronous check
    return isInFarcasterMiniapp();
  } catch (error) {
    console.warn('Error checking miniapp status with SDK:', error);
    // Fallback to synchronous check
    return isInFarcasterMiniapp();
  }
}

/**
 * Gets the Farcaster SDK if available
 * @returns Farcaster SDK object or null
 */
export function getFarcasterSDK(): any {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as any).farcaster || null;
}
