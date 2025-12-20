import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as inventoryTransferModule from '@/lib/services/inventoryTransfer';
import * as inventoryModule from '@/lib/inventory';
import * as gasEstimatorModule from '@/lib/services/gasEstimator';
import type { Address } from 'viem';

vi.mock('@/lib/inventory');
vi.mock('@/lib/services/gasEstimator');

describe('inventoryTransfer', () => {
  const mockPublicClient = {
    waitForTransactionReceipt: vi.fn().mockResolvedValue({}),
  } as any;
  const mockWalletClient = {
    getAddresses: vi.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890' as Address]),
    writeContract: vi.fn().mockResolvedValue('0xtx123' as `0x${string}`),
  } as any;
  const mockAddress = '0x1234567890123456789012345678901234567890' as Address;
  const mockTBAAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transferItem', () => {
    it('should transfer item from adventurer to tavernkeeper', async () => {
      (inventoryModule.getAdventurerTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (inventoryModule.getTavernKeeperTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (gasEstimatorModule.estimateTransferGas as any) = vi.fn().mockResolvedValue({
        gasLimit: 100000n,
        gasPrice: 1000000000n,
      });

      const result = await inventoryTransferModule.transferItem(
        {
          chainId: 143,
          inventoryContract: mockAddress,
          itemId: 100n,
          amount: 1n,
          fromType: 'adventurer',
          fromContract: mockAddress,
          fromTokenId: 1n,
          toType: 'tavernkeeper',
          toContract: mockAddress,
          toTokenId: 1n,
        },
        mockPublicClient,
        mockWalletClient
      );

      expect(result).toEqual({ txHash: '0xtx123' });
      expect(mockWalletClient.writeContract).toHaveBeenCalled();
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalled();
    });

    it('should transfer item from tavernkeeper to adventurer', async () => {
      (inventoryModule.getAdventurerTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (inventoryModule.getTavernKeeperTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (gasEstimatorModule.estimateTransferGas as any) = vi.fn().mockResolvedValue({
        gasLimit: 100000n,
        gasPrice: 1000000000n,
      });

      const result = await inventoryTransferModule.transferItem(
        {
          chainId: 143,
          inventoryContract: mockAddress,
          itemId: 100n,
          amount: 1n,
          fromType: 'tavernkeeper',
          fromContract: mockAddress,
          fromTokenId: 1n,
          toType: 'adventurer',
          toContract: mockAddress,
          toTokenId: 1n,
        },
        mockPublicClient,
        mockWalletClient
      );

      expect(result).toEqual({ txHash: '0xtx123' });
      expect(inventoryModule.getTavernKeeperTBA).toHaveBeenCalled();
      expect(inventoryModule.getAdventurerTBA).toHaveBeenCalled();
    });

    it('should throw error if no wallet connected', async () => {
      const mockWalletClientNoAccount = {
        getAddresses: vi.fn().mockResolvedValue([]),
      } as any;

      (inventoryModule.getAdventurerTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (inventoryModule.getTavernKeeperTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (gasEstimatorModule.estimateTransferGas as any) = vi.fn().mockResolvedValue({
        gasLimit: 100000n,
        gasPrice: 1000000000n,
      });

      await expect(
        inventoryTransferModule.transferItem(
          {
            chainId: 143,
            inventoryContract: mockAddress,
            itemId: 100n,
            amount: 1n,
            fromType: 'adventurer',
            fromContract: mockAddress,
            fromTokenId: 1n,
            toType: 'tavernkeeper',
            toContract: mockAddress,
            toTokenId: 1n,
          },
          mockPublicClient,
          mockWalletClientNoAccount
        )
      ).rejects.toThrow('No wallet connected');
    });
  });

  describe('unequipItem', () => {
    it('should unequip item from adventurer to tavernkeeper', async () => {
      (inventoryModule.getAdventurerTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (inventoryModule.getTavernKeeperTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (gasEstimatorModule.estimateTransferGas as any) = vi.fn().mockResolvedValue({
        gasLimit: 100000n,
        gasPrice: 1000000000n,
      });

      const result = await inventoryTransferModule.unequipItem(
        143,
        mockAddress,
        100n,
        1n,
        mockAddress,
        1n,
        mockAddress,
        1n,
        mockPublicClient,
        mockWalletClient
      );

      expect(result).toEqual({ txHash: '0xtx123' });
      expect(inventoryModule.getAdventurerTBA).toHaveBeenCalled();
      expect(inventoryModule.getTavernKeeperTBA).toHaveBeenCalled();
    });
  });

  describe('equipItem', () => {
    it('should equip item from tavernkeeper to adventurer', async () => {
      (inventoryModule.getAdventurerTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (inventoryModule.getTavernKeeperTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (gasEstimatorModule.estimateTransferGas as any) = vi.fn().mockResolvedValue({
        gasLimit: 100000n,
        gasPrice: 1000000000n,
      });

      const result = await inventoryTransferModule.equipItem(
        143,
        mockAddress,
        100n,
        1n,
        mockAddress,
        1n,
        mockAddress,
        1n,
        mockPublicClient,
        mockWalletClient
      );

      expect(result).toEqual({ txHash: '0xtx123' });
      expect(inventoryModule.getTavernKeeperTBA).toHaveBeenCalled();
      expect(inventoryModule.getAdventurerTBA).toHaveBeenCalled();
    });
  });
});

