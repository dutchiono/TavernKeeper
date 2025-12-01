/**
 * Farcaster Miniapp Detection Utility
 *
 * Detects if the app is running inside a Farcaster miniapp context
 * to switch between warplet (Farcaster's built-in wallet) and
 * regular browser wallets (MetaMask, WalletConnect, etc.)
 */

/**
 * Checks if the app is running inside a Farcaster miniapp
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
 * Gets the Farcaster SDK if available
 * @returns Farcaster SDK object or null
 */
export function getFarcasterSDK(): any {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as any).farcaster || null;
}
