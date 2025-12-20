import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as marketplaceModule from '@/lib/services/marketplace';
import * as supabaseModule from '@/lib/supabase';
import * as pseudoswapModule from '@/lib/services/pseudoswap';
import type { Address } from 'viem';

vi.mock('@/lib/supabase');
vi.mock('@/lib/services/pseudoswap');

describe('marketplace', () => {
  const mockPublicClient = {} as any;
  const mockWalletClient = {} as any;
  const mockAddress = '0x1234567890123456789012345678901234567890' as Address;
  const mockPoolAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listItem', () => {
    it('should create a listing successfully', async () => {
      const mockListing = {
        id: 'listing-123',
        seller_address: mockAddress,
        asset_type: 'adventurer',
        asset_id: '1',
        asset_contract: mockAddress,
        includes_inventory: true,
        price_erc20: '1000000000000000000',
        pseudoswap_pool_address: mockPoolAddress,
        status: 'active',
        metadata: {},
        created_at: new Date().toISOString(),
      };

      (pseudoswapModule.createPool as any) = vi.fn().mockResolvedValue({
        poolAddress: mockPoolAddress,
        txHash: '0xtx123' as `0x${string}`,
      });

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
          }),
        }),
      });

      const result = await marketplaceModule.listItem(
        {
          assetType: 'adventurer',
          assetId: '1',
          assetContract: mockAddress,
          priceErc20: '1000000000000000000',
          includesInventory: true,
        },
        mockAddress,
        143,
        mockAddress,
        mockAddress,
        mockPublicClient,
        mockWalletClient
      );

      expect(result).toEqual({
        listingId: 'listing-123',
        poolAddress: mockPoolAddress,
        txHash: '0xtx123',
      });
      expect(pseudoswapModule.createPool).toHaveBeenCalled();
    });

    it('should throw error if pool creation fails', async () => {
      (pseudoswapModule.createPool as any) = vi.fn().mockRejectedValue(
        new Error('Pool creation failed')
      );

      await expect(
        marketplaceModule.listItem(
          {
            assetType: 'adventurer',
            assetId: '1',
            assetContract: mockAddress,
            priceErc20: '1000000000000000000',
            includesInventory: true,
          },
          mockAddress,
          143,
          mockAddress,
          mockAddress,
          mockPublicClient,
          mockWalletClient
        )
      ).rejects.toThrow('Pool creation failed');
    });

    it('should throw error if database insert fails', async () => {
      (pseudoswapModule.createPool as any) = vi.fn().mockResolvedValue({
        poolAddress: mockPoolAddress,
        txHash: '0xtx123' as `0x${string}`,
      });

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(
        marketplaceModule.listItem(
          {
            assetType: 'adventurer',
            assetId: '1',
            assetContract: mockAddress,
            priceErc20: '1000000000000000000',
            includesInventory: true,
          },
          mockAddress,
          143,
          mockAddress,
          mockAddress,
          mockPublicClient,
          mockWalletClient
        )
      ).rejects.toThrow('Failed to create listing');
    });
  });

  describe('buyItem', () => {
    it('should buy an item successfully', async () => {
      const mockListing = {
        id: 'listing-123',
        pseudoswap_pool_address: mockPoolAddress,
        price_erc20: '1000000000000000000',
        status: 'active',
      };

      (supabaseModule.supabase.from as any) = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

      (pseudoswapModule.buyFromPool as any) = vi.fn().mockResolvedValue({
        txHash: '0xtx456' as `0x${string}`,
      });

      const result = await marketplaceModule.buyItem(
        'listing-123',
        mockAddress,
        143,
        mockPublicClient,
        mockWalletClient
      );

      expect(result).toEqual({ txHash: '0xtx456' });
      expect(pseudoswapModule.buyFromPool).toHaveBeenCalled();
    });

    it('should throw error if listing not found', async () => {
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
        marketplaceModule.buyItem('listing-123', mockAddress, 143, mockPublicClient, mockWalletClient)
      ).rejects.toThrow('Listing not found or not active');
    });

    it('should throw error if listing has no pool address', async () => {
      const mockListing = {
        id: 'listing-123',
        pseudoswap_pool_address: null,
        price_erc20: '1000000000000000000',
        status: 'active',
      };

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
            }),
          }),
        }),
      });

      await expect(
        marketplaceModule.buyItem('listing-123', mockAddress, 143, mockPublicClient, mockWalletClient)
      ).rejects.toThrow('Listing has no pool address');
    });
  });

  describe('cancelListing', () => {
    it('should cancel a listing successfully', async () => {
      const mockListing = {
        id: 'listing-123',
        seller_address: mockAddress,
        pseudoswap_pool_address: mockPoolAddress,
        status: 'active',
      };

      (supabaseModule.supabase.from as any) = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

      (pseudoswapModule.removeLiquidity as any) = vi.fn().mockResolvedValue({
        txHash: '0xtx789' as `0x${string}`,
      });

      const result = await marketplaceModule.cancelListing(
        'listing-123',
        mockAddress,
        mockPublicClient,
        mockWalletClient
      );

      expect(result).toEqual({ txHash: '0xtx789' });
      expect(pseudoswapModule.removeLiquidity).toHaveBeenCalled();
    });

    it('should throw error if listing not found', async () => {
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(
        marketplaceModule.cancelListing('listing-123', mockAddress, mockPublicClient, mockWalletClient)
      ).rejects.toThrow('Listing not found or not active');
    });
  });

  describe('getListings', () => {
    it('should get all active listings', async () => {
      const mockListings = [
        {
          id: 'listing-1',
          seller_address: mockAddress,
          asset_type: 'adventurer',
          asset_id: '1',
          asset_contract: mockAddress,
          includes_inventory: true,
          price_erc20: '1000000000000000000',
          pseudoswap_pool_address: mockPoolAddress,
          status: 'active',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockListings, error: null }),
          }),
        }),
      });

      const result = await marketplaceModule.getListings();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('listing-1');
    });

    it('should filter by asset type', async () => {
      const mockListings = [
        {
          id: 'listing-1',
          seller_address: mockAddress,
          asset_type: 'adventurer',
          asset_id: '1',
          asset_contract: mockAddress,
          includes_inventory: true,
          price_erc20: '1000000000000000000',
          pseudoswap_pool_address: mockPoolAddress,
          status: 'active',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      let queryChain: any = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockListings, error: null }),
      };

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(queryChain),
      });

      const result = await marketplaceModule.getListings({ assetType: 'adventurer' });

      expect(result).toHaveLength(1);
      expect(queryChain.eq).toHaveBeenCalledWith('asset_type', 'adventurer');
    });

    it('should filter by price range', async () => {
      const mockListings: any[] = [];

      let queryChain: any = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockListings, error: null }),
      };

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(queryChain),
      });

      await marketplaceModule.getListings({
        minPrice: '1000000000000000000',
        maxPrice: '2000000000000000000',
      });

      expect(queryChain.gte).toHaveBeenCalledWith('price_erc20', '1000000000000000000');
      expect(queryChain.lte).toHaveBeenCalledWith('price_erc20', '2000000000000000000');
    });

    it('should throw error on database failure', async () => {
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(marketplaceModule.getListings()).rejects.toThrow('Failed to fetch listings');
    });
  });

  describe('getListing', () => {
    it('should get a single listing by ID', async () => {
      const mockListing = {
        id: 'listing-123',
        seller_address: mockAddress,
        asset_type: 'adventurer',
        asset_id: '1',
        asset_contract: mockAddress,
        includes_inventory: true,
        price_erc20: '1000000000000000000',
        pseudoswap_pool_address: mockPoolAddress,
        status: 'active',
        metadata: {},
        created_at: new Date().toISOString(),
      };

      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
          }),
        }),
      });

      const result = await marketplaceModule.getListing('listing-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('listing-123');
    });

    it('should return null if listing not found', async () => {
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

      const result = await marketplaceModule.getListing('listing-123');

      expect(result).toBeNull();
    });
  });
});

