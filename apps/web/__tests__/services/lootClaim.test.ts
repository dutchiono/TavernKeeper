import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as lootClaimModule from '@/lib/services/lootClaim';
import * as supabaseModule from '@/lib/supabase';
import * as inventoryModule from '@/lib/inventory';
import * as gasEstimatorModule from '@/lib/services/gasEstimator';
import type { Address } from 'viem';

vi.mock('@/lib/supabase');
vi.mock('@/lib/inventory');
vi.mock('@/lib/services/gasEstimator');
vi.mock('@/lib/wallet/testnetWallet');

describe('lootClaim', () => {
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

  describe('getLootClaim', () => {
    it('should get a loot claim by ID', async () => {
      const mockClaim = {
        id: 'claim-123',
        run_id: 'run-456',
        adventurer_id: 'adv-789',
        adventurer_contract: mockAddress,
        adventurer_token_id: '1',
        items: [{ id: 'item-1', name: 'Sword', type: 'weapon', tokenId: '100', amount: '1' }],
        claimed: false,
      };

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockClaim, error: null }),
          }),
        }),
      });

      const result = await lootClaimModule.getLootClaim('claim-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('claim-123');
      expect(result?.runId).toBe('run-456');
      expect(result?.claimed).toBe(false);
    });

    it('should return null if claim not found', async () => {
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const result = await lootClaimModule.getLootClaim('claim-123');

      expect(result).toBeNull();
    });
  });

  describe('getUnclaimedLoot', () => {
    it('should get unclaimed loot for a run', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          run_id: 'run-456',
          adventurer_id: 'adv-1',
          adventurer_contract: mockAddress,
          adventurer_token_id: '1',
          items: [{ id: 'item-1', name: 'Sword', type: 'weapon', tokenId: '100', amount: '1' }],
          claimed: false,
        },
        {
          id: 'claim-2',
          run_id: 'run-456',
          adventurer_id: 'adv-2',
          adventurer_contract: mockAddress,
          adventurer_token_id: '2',
          items: [{ id: 'item-2', name: 'Shield', type: 'armor', tokenId: '101', amount: '1' }],
          claimed: false,
        },
      ];

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockClaims, error: null }),
          }),
        }),
      });

      const result = await lootClaimModule.getUnclaimedLoot('run-456');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('claim-1');
      expect(result[1].id).toBe('claim-2');
    });

    it('should throw error on database failure', async () => {
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(lootClaimModule.getUnclaimedLoot('run-456')).rejects.toThrow(
        'Failed to fetch loot claims'
      );
    });
  });

  describe('createLootClaims', () => {
    it('should create loot claims for a completed run', async () => {
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await lootClaimModule.createLootClaims('run-456', [
        {
          adventurerId: 'adv-1',
          adventurerContract: mockAddress,
          adventurerTokenId: 1n,
          items: [{ id: 'item-1', name: 'Sword', type: 'weapon', tokenId: '100', amount: '1' }],
        },
      ]);

      expect(supabaseModule.supabase.from).toHaveBeenCalledWith('loot_claims');
    });

    it('should throw error on database failure', async () => {
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Database error' },
        }),
      });

      await expect(
        lootClaimModule.createLootClaims('run-456', [
          {
            adventurerId: 'adv-1',
            adventurerContract: mockAddress,
            adventurerTokenId: 1n,
            items: [],
          },
        ])
      ).rejects.toThrow('Failed to create loot claims');
    });
  });

  describe('claimLoot', () => {
    it('should claim loot successfully', async () => {
      const mockClaim = {
        id: 'claim-123',
        run_id: 'run-456',
        adventurer_id: 'adv-789',
        adventurer_contract: mockAddress,
        adventurer_token_id: '1',
        items: [{ id: 'item-1', name: 'Sword', type: 'weapon', tokenId: '100', amount: '1' }],
        claimed: false,
      };

      (supabaseModule.supabase.from as any) = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockClaim, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

      (inventoryModule.getAdventurerTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (gasEstimatorModule.estimateMintGas as any) = vi.fn().mockResolvedValue({
        gasLimit: 100000n,
        gasPrice: 1000000000n,
        protocolFee: 1000000000000000n,
      });

      const result = await lootClaimModule.claimLoot(
        'claim-123',
        mockPublicClient,
        mockWalletClient,
        143,
        mockAddress
      );

      expect(result).toEqual({ txHash: '0xtx123' });
      expect(mockWalletClient.writeContract).toHaveBeenCalled();
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalled();
    });

    it('should throw error if claim not found', async () => {
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      await expect(
        lootClaimModule.claimLoot('claim-123', mockPublicClient, mockWalletClient, 143, mockAddress)
      ).rejects.toThrow('Loot claim not found or already claimed');
    });

    it('should throw error if claim already claimed', async () => {
      // When claim is already claimed, the query filters for claimed: false, so it won't find it
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      await expect(
        lootClaimModule.claimLoot('claim-123', mockPublicClient, mockWalletClient, 143, mockAddress)
      ).rejects.toThrow('Loot claim not found or already claimed');
    });

    it('should throw error if no wallet connected', async () => {
      const mockClaim = {
        id: 'claim-123',
        adventurer_contract: mockAddress,
        adventurer_token_id: '1',
        items: [],
        claimed: false,
      };

      const mockWalletClientNoAccount = {
        getAddresses: vi.fn().mockResolvedValue([]),
      } as any;

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockClaim, error: null }),
            }),
          }),
        }),
      });

      (inventoryModule.getAdventurerTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);

      await expect(
        lootClaimModule.claimLoot(
          'claim-123',
          mockPublicClient,
          mockWalletClientNoAccount,
          143,
          mockAddress
        )
      ).rejects.toThrow('No wallet connected');
    });
  });

  describe('estimateClaimGas', () => {
    it('should estimate gas for claiming loot', async () => {
      const mockClaim = {
        id: 'claim-123',
        adventurer_contract: mockAddress,
        adventurer_token_id: '1',
        items: [{ id: 'item-1', name: 'Sword', type: 'weapon', tokenId: '100', amount: '1' }],
        claimed: false,
      };

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockClaim, error: null }),
            }),
          }),
        }),
      });

      (inventoryModule.getAdventurerTBA as any) = vi.fn().mockResolvedValue(mockTBAAddress);
      (gasEstimatorModule.estimateMintGas as any) = vi.fn().mockResolvedValue({
        gasLimit: 100000n,
        gasPrice: 1000000000n,
        protocolFee: 1000000000000000n,
      });

      const result = await lootClaimModule.estimateClaimGas('claim-123', mockPublicClient, 143, mockAddress);

      expect(result).toEqual({
        gasLimit: 100000n,
        gasPrice: 1000000000n,
        protocolFee: 1000000000000000n,
      });
    });

    it('should throw error if claim not found', async () => {
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      await expect(
        lootClaimModule.estimateClaimGas('claim-123', mockPublicClient, 143, mockAddress)
      ).rejects.toThrow('Loot claim not found or already claimed');
    });
  });
});

