/**
 * Testnet Wallet Utility
 * Creates a wallet client from a private key for testing purposes
 *
 * WARNING: Only use this for testnet/development. Never expose private keys in production.
 */

import { createWalletClient, http, type Address, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad } from '../chains';

/**
 * Create a wallet client from a private key
 * Private key should be in .env as TESTNET_PRIVATE_KEY
 */
export function createTestnetWallet(): WalletClient | null {
  const privateKey = process.env.TESTNET_PRIVATE_KEY;

  if (!privateKey) {
    console.warn('TESTNET_PRIVATE_KEY not set in environment variables');
    return null;
  }

  // Remove '0x' prefix if present
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  try {
    const account = privateKeyToAccount(`0x${cleanKey}` as `0x${string}`);

    return createWalletClient({
      account,
      chain: monad,
      transport: http(),
    });
  } catch (error) {
    console.error('Failed to create testnet wallet:', error);
    return null;
  }
}

/**
 * Get the wallet address from the private key
 */
export function getTestnetWalletAddress(): Address | null {
  const privateKey = process.env.TESTNET_PRIVATE_KEY;

  if (!privateKey) {
    return null;
  }

  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  try {
    const account = privateKeyToAccount(`0x${cleanKey}` as `0x${string}`);
    return account.address;
  } catch (error) {
    console.error('Failed to get wallet address:', error);
    return null;
  }
}

/**
 * Check if testnet wallet is configured
 */
export function isTestnetWalletConfigured(): boolean {
  return !!process.env.TESTNET_PRIVATE_KEY;
}

