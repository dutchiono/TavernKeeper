import { POST } from '@/app/api/marketplace/list/route';
import * as marketplaceModule from '@/lib/services/marketplace';
import * as testnetWalletModule from '@/lib/wallet/testnetWallet';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/marketplace');
vi.mock('@/lib/wallet/testnetWallet');

describe('POST /api/marketplace/list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_KEEP_TOKEN_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS = '0x0987654321098765432109876543210987654321';
  });

  it('should list an item successfully', async () => {
    const mockListing = {
      listingId: 'listing-123',
      poolAddress: '0xpool123',
      txHash: '0xtx123',
    };

    (marketplaceModule.listItem as any) = vi.fn().mockResolvedValue(mockListing);
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue({});
    (testnetWalletModule.getTestnetWalletAddress as any) = vi.fn().mockReturnValue('0xseller123');

    const request = new NextRequest('http://localhost/api/marketplace/list', {
      method: 'POST',
      body: JSON.stringify({
        assetType: 'item',
        assetId: 'item-123',
        assetContract: '0xcontract123',
        priceErc20: '1000000000000000000',
        sellerAddress: '0xseller123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.listingId).toBe('listing-123');
    expect(data.poolAddress).toBe('0xpool123');
    expect(data.txHash).toBe('0xtx123');
    expect(marketplaceModule.listItem).toHaveBeenCalled();
  });

  it('should return 400 if required fields are missing', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/list', {
      method: 'POST',
      body: JSON.stringify({
        assetType: 'item',
        // Missing assetId, assetContract, priceErc20
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 500 if contract addresses not configured', async () => {
    delete process.env.NEXT_PUBLIC_KEEP_TOKEN_ADDRESS;

    const request = new NextRequest('http://localhost/api/marketplace/list', {
      method: 'POST',
      body: JSON.stringify({
        assetType: 'item',
        assetId: 'item-123',
        assetContract: '0xcontract123',
        priceErc20: '1000000000000000000',
        sellerAddress: '0xseller123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Contract addresses not configured');
  });

  it('should return 400 if wallet not configured', async () => {
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/marketplace/list', {
      method: 'POST',
      body: JSON.stringify({
        assetType: 'item',
        assetId: 'item-123',
        assetContract: '0xcontract123',
        priceErc20: '1000000000000000000',
        sellerAddress: '0xseller123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Wallet not configured');
  });

  it('should return 400 if sellerAddress not provided (validation happens before fallback)', async () => {
    // The route validates sellerAddress === undefined before using fallback
    // This is expected behavior - sellerAddress must be explicitly provided or set to null
    const request = new NextRequest('http://localhost/api/marketplace/list', {
      method: 'POST',
      body: JSON.stringify({
        assetType: 'item',
        assetId: 'item-123',
        assetContract: '0xcontract123',
        priceErc20: '1000000000000000000',
        // sellerAddress not provided - will fail validation
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should handle includesInventory flag', async () => {
    const mockListing = {
      listingId: 'listing-123',
      poolAddress: '0xpool123',
      txHash: '0xtx123',
    };

    (marketplaceModule.listItem as any) = vi.fn().mockResolvedValue(mockListing);
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue({});
    (testnetWalletModule.getTestnetWalletAddress as any) = vi.fn().mockReturnValue('0xseller123');

    const request = new NextRequest('http://localhost/api/marketplace/list', {
      method: 'POST',
      body: JSON.stringify({
        assetType: 'adventurer',
        assetId: 'adv-123',
        assetContract: '0xcontract123',
        priceErc20: '1000000000000000000',
        sellerAddress: '0xseller123',
        includesInventory: true,
        metadata: { name: 'Test Adventurer' },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(marketplaceModule.listItem).toHaveBeenCalledWith(
      expect.objectContaining({ includesInventory: true }),
      expect.any(String),
      expect.any(Number),
      expect.any(String),
      expect.any(String),
      expect.anything(),
      expect.anything()
    );
  });
});
