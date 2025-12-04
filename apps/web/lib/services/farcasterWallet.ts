/**
 * Farcaster SDK Wallet Service
 *
 * Handles wallet connection when running in Farcaster miniapp context.
 * Uses Farcaster's built-in wallet (warplet) via the miniapp SDK.
 */

import { createWalletClient, custom, type Address, type WalletClient } from 'viem';
import { monad } from '../chains';
import { isInFarcasterMiniapp } from '../utils/farcasterDetection';

/**
 * Get the Ethereum provider from Farcaster SDK
 * Returns an EIP-1193 compatible provider
 */
export async function getFarcasterEthereumProvider(): Promise<any | null> {
  if (!isInFarcasterMiniapp()) {
    return null;
  }

  try {
    // Try to use the miniapp SDK
    const { sdk } = await import('@farcaster/miniapp-sdk');

    if (sdk?.wallet?.getEthereumProvider) {
      return sdk.wallet.getEthereumProvider();
    }

    // Fallback: check window.farcaster
    if (typeof window !== 'undefined' && (window as any).farcaster) {
      const farcaster = (window as any).farcaster;
      if (farcaster.wallet?.getEthereumProvider) {
        return farcaster.wallet.getEthereumProvider();
      }
    }

    console.warn('Farcaster Ethereum provider not available');
    return null;
  } catch (error) {
    console.error('Error getting Farcaster Ethereum provider:', error);
    return null;
  }
}

/**
 * Get wallet address from Farcaster SDK
 */
export async function getFarcasterWalletAddress(): Promise<Address | null> {
  try {
    const provider = await getFarcasterEthereumProvider();
    if (!provider) {
      return null;
    }

    // Use EIP-1193 eth_accounts method
    const accounts = await provider.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      return accounts[0] as Address;
    }

    return null;
  } catch (error) {
    console.error('Error getting Farcaster wallet address:', error);
    return null;
  }
}

/**
 * Create a viem-compatible wallet client from Farcaster SDK
 * This wraps the Farcaster SDK's Ethereum provider to work with viem
 */
export async function createFarcasterWalletClient(): Promise<WalletClient | null> {
  if (!isInFarcasterMiniapp()) {
    return null;
  }

  try {
    const provider = await getFarcasterEthereumProvider();
    if (!provider) {
      console.warn('Farcaster Ethereum provider not available');
      return null;
    }

    // Get the address first
    const address = await getFarcasterWalletAddress();
    if (!address) {
      console.warn('No wallet address available from Farcaster SDK');
      return null;
    }

    // Create a wallet client using the custom provider
    // The custom() transport wraps an EIP-1193 provider
    return createWalletClient({
      account: address,
      chain: monad,
      transport: custom(provider),
    });
  } catch (error) {
    console.error('Error creating Farcaster wallet client:', error);
    return null;
  }
}

/**
 * Check if Farcaster wallet is connected
 */
export async function isFarcasterWalletConnected(): Promise<boolean> {
  if (!isInFarcasterMiniapp()) {
    return false;
  }

  try {
    const address = await getFarcasterWalletAddress();
    return address !== null;
  } catch (error) {
    console.error('Error checking Farcaster wallet connection:', error);
    return false;
  }
}

/**
 * Get a wallet client based on context
 * Returns Farcaster SDK wallet if in miniapp, otherwise returns null
 * (browser wallet should be handled by wagmi hooks)
 */
export async function getContextualWalletClient(): Promise<WalletClient | null> {
  if (isInFarcasterMiniapp()) {
    return await createFarcasterWalletClient();
  }
  return null;
}
