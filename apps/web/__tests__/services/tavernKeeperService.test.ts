/**
 * TavernKeeper Service Integration Tests
 *
 * Tests for the TavernKeeper service using REAL testnet contracts and wallets.
 * These tests actually call the deployed contracts on Monad testnet.
 *
 * Requirements:
 * - Testnet wallets in packages/contracts/wallets/testnet-keys.json
 * - NEXT_PUBLIC_MONAD_RPC_URL set in environment
 * - Contracts deployed on testnet
 */

import * as fs from 'fs';
import * as path from 'path';
import { createPublicClient, createWalletClient, http, type Address, type PublicClient, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { tavernKeeperService } from '../../lib/services/tavernKeeperService';
import { monad } from '../../lib/chains';

// Test configuration
const keysFile = path.join(__dirname, '../../../packages/contracts/wallets/testnet-keys.json');
const deploymentFile = path.join(__dirname, '../../../packages/contracts/wallets/deployment-info.json');
const rpcUrl = process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';

// Test data
let testWallets: Array<{ address: Address; walletClient: WalletClient }> = [];
let publicClient: PublicClient;
let tavernKeeperAddress: Address | undefined;

describe('tavernKeeperService Integration Tests', () => {
  beforeAll(async () => {
    // Check if testnet keys file exists
    if (!fs.existsSync(keysFile)) {
      console.warn('⚠️  Skipping integration tests - testnet keys not found at:', keysFile);
      console.warn('   Run: cd packages/contracts && npx hardhat run scripts/generateTestWallets.ts');
      return;
    }

    // Check if RPC URL is configured
    if (!process.env.NEXT_PUBLIC_MONAD_RPC_URL) {
      console.warn('⚠️  Skipping integration tests - NEXT_PUBLIC_MONAD_RPC_URL not set');
      return;
    }

    try {
      // Load testnet wallets
      const keysData = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
      const walletsToUse = keysData.testWallets?.slice(0, 2) || []; // Use first 2 wallets

      if (walletsToUse.length === 0) {
        console.warn('⚠️  No test wallets found in keys file');
        return;
      }

      // Create wallet clients from testnet private keys
      testWallets = walletsToUse.map((wallet: any) => {
        const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
        return {
          address: wallet.address as Address,
          walletClient: createWalletClient({
            account,
            chain: monad,
            transport: http(rpcUrl),
          }),
        };
      });

      // Create public client for reading contract state
      publicClient = createPublicClient({
        chain: monad,
        transport: http(rpcUrl),
      });

      // Load contract addresses
      if (fs.existsSync(deploymentFile)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        tavernKeeperAddress = deploymentData.contracts?.tavernKeeperProxy as Address;
      } else {
        // Fallback to hardcoded address from TESTNET_SETUP.md
        tavernKeeperAddress = '0x4Fff2Ce5144989246186462337F0eE2C086F913E' as Address;
      }

      console.log('✅ Integration test setup complete');
      console.log(`   Using ${testWallets.length} test wallets`);
      console.log(`   TavernKeeper contract: ${tavernKeeperAddress}`);
    } catch (error) {
      console.error('❌ Failed to setup integration tests:', error);
      throw error;
    }
  });

  beforeEach(() => {
    // Clear cache before each test
    tavernKeeperService._cache.data = null;
    tavernKeeperService._cache.timestamp = 0;
  });

  describe('getOfficeState', () => {
    it('should fetch real office state from testnet contract', async () => {
      if (testWallets.length === 0 || !tavernKeeperAddress) {
        console.log('⏭️  Skipping - testnet not configured');
        return;
      }

      const state = await tavernKeeperService.getOfficeState();

      expect(state).toBeDefined();
      expect(state.currentKing).toBeDefined();
      expect(state.currentPrice).toBeDefined();
      expect(state.officeRate).toBeDefined();
      expect(state.totalEarned).toBeDefined();
      expect(state.kingSince).toBeGreaterThan(0);

      // Verify currentKing is a valid address format
      expect(state.currentKing).toMatch(/^0x[a-fA-F0-9]{40}$|^0x0000\.\.\.0000$/);
    }, 30000); // 30 second timeout for RPC calls

    it('should cache office state', async () => {
      if (testWallets.length === 0 || !tavernKeeperAddress) {
        console.log('⏭️  Skipping - testnet not configured');
        return;
      }

      // First call
      const state1 = await tavernKeeperService.getOfficeState();
      const timestamp1 = tavernKeeperService._cache.timestamp;

      // Second call should return cached data
      const state2 = await tavernKeeperService.getOfficeState();
      const timestamp2 = tavernKeeperService._cache.timestamp;

      // Cache timestamp should be the same
      expect(timestamp1).toBe(timestamp2);
      // State should be the same (check key fields)
      expect(state1.currentKing).toBe(state2.currentKing);
      expect(state1.currentPrice).toBe(state2.currentPrice);
      expect(state1.officeRate).toBe(state2.officeRate);
    }, 30000);
  });

  describe('takeOffice', () => {
    it('should throw error if contract address not found', async () => {
      if (testWallets.length === 0) {
        console.log('⏭️  Skipping - testnet not configured');
        return;
      }

      // Temporarily override getContractAddress to return undefined
      const registryModule = await import('../../lib/contracts/registry');

      // Mock to return undefined
      const getContractAddressSpy = vi.spyOn(registryModule, 'getContractAddress').mockReturnValueOnce(undefined);

      const mockClient = testWallets[0].walletClient;

      await expect(
        tavernKeeperService.takeOffice(mockClient, '0.001', testWallets[0].address)
      ).rejects.toThrow('TavernKeeper contract not found');

      // Restore
      getContractAddressSpy.mockRestore();
    });

    it('should throw error if account not found', async () => {
      if (testWallets.length === 0) {
        console.log('⏭️  Skipping - testnet not configured');
        return;
      }

      const mockClient = {
        writeContract: testWallets[0].walletClient.writeContract,
        // No account property
      };

      await expect(
        tavernKeeperService.takeOffice(mockClient, '0.001')
      ).rejects.toThrow('Account not found');
    });

    it('should actually take office on testnet with real transaction', async () => {
      if (testWallets.length === 0 || !tavernKeeperAddress) {
        console.log('⏭️  Skipping - testnet not configured');
        return;
      }

      const wallet = testWallets[0];

      // Get current office state to know the price
      const currentState = await tavernKeeperService.getOfficeState();
      const currentPrice = currentState.currentPrice;

      // Check if we have enough balance (need MON for gas + price)
      const balance = await publicClient.getBalance({ address: wallet.address });
      const priceInWei = BigInt(Math.floor(parseFloat(currentPrice) * 10 ** 18));

      if (balance < priceInWei + BigInt(10 ** 17)) { // Price + 0.1 MON for gas
        console.log('⏭️  Skipping - insufficient balance for transaction');
        return;
      }

      // Execute takeOffice with real wallet client
      const hash = await tavernKeeperService.takeOffice(
        wallet.walletClient,
        currentPrice,
        wallet.address
      );

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe('success');

      // Verify office state updated after transaction
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for state to update
      const newState = await tavernKeeperService.getOfficeState();

      // New king should be our wallet address (or at least different from before)
      expect(newState.currentKing.toLowerCase()).toBe(wallet.address.toLowerCase());
    }, 60000); // 60 second timeout for transaction

    it('should use accountAddress parameter when account not on client', async () => {
      if (testWallets.length < 2 || !tavernKeeperAddress) {
        console.log('⏭️  Skipping - need at least 2 test wallets');
        return;
      }

      const wallet = testWallets[1];
      const currentState = await tavernKeeperService.getOfficeState();
      const currentPrice = currentState.currentPrice;

      // Create client without account property
      const clientWithoutAccount = {
        writeContract: wallet.walletClient.writeContract,
        // No account property
      };

      const hash = await tavernKeeperService.takeOffice(
        clientWithoutAccount,
        currentPrice,
        wallet.address
      );

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    }, 60000);

    it('should use getAddresses if available and account not found', async () => {
      if (testWallets.length === 0 || !tavernKeeperAddress) {
        console.log('⏭️  Skipping - testnet not configured');
        return;
      }

      const wallet = testWallets[0];
      const currentState = await tavernKeeperService.getOfficeState();
      const currentPrice = currentState.currentPrice;

      // Create client with getAddresses but no account
      const clientWithGetAddresses = {
        writeContract: wallet.walletClient.writeContract,
        getAddresses: async () => [wallet.address],
        // No account property
      };

      const hash = await tavernKeeperService.takeOffice(
        clientWithGetAddresses,
        currentPrice
      );

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    }, 60000);
  });
});
