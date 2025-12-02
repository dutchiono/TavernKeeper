import { GET } from '@/app/api/marketplace/listings/route';
import * as marketplaceModule from '@/lib/services/marketplace';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/marketplace');

describe('GET /api/marketplace/listings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all listings', async () => {
    const mockListings = [
      {
        id: 'listing-1',
        assetType: 'item',
        assetId: 'item-123',
        priceErc20: '1000000000000000000',
      },
      {
        id: 'listing-2',
        assetType: 'adventurer',
        assetId: 'adv-456',
        priceErc20: '2000000000000000000',
      },
    ];

    (marketplaceModule.getListings as any) = vi.fn().mockResolvedValue(mockListings);

    const request = new NextRequest('http://localhost/api/marketplace/listings');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.listings).toEqual(mockListings);
    // Route passes all filter params - searchParams.get() returns null (not undefined) when param doesn't exist
    expect(marketplaceModule.getListings).toHaveBeenCalledWith({
      assetType: null,
      sellerAddress: null,
      minPrice: undefined,
      maxPrice: undefined,
    });
  });

  it('should filter by assetType', async () => {
    const mockListings = [
      {
        id: 'listing-1',
        assetType: 'item',
        assetId: 'item-123',
        priceErc20: '1000000000000000000',
      },
    ];

    (marketplaceModule.getListings as any) = vi.fn().mockResolvedValue(mockListings);

    const request = new NextRequest('http://localhost/api/marketplace/listings?assetType=item');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.listings).toEqual(mockListings);
    // Route passes all filter params - searchParams.get() returns null (not undefined) when param doesn't exist
    expect(marketplaceModule.getListings).toHaveBeenCalledWith({
      assetType: 'item',
      sellerAddress: null,
      minPrice: undefined,
      maxPrice: undefined,
    });
  });

  it('should filter by sellerAddress', async () => {
    const mockListings = [
      {
        id: 'listing-1',
        assetType: 'item',
        assetId: 'item-123',
        priceErc20: '1000000000000000000',
        sellerAddress: '0xseller123',
      },
    ];

    (marketplaceModule.getListings as any) = vi.fn().mockResolvedValue(mockListings);

    const request = new NextRequest('http://localhost/api/marketplace/listings?sellerAddress=0xseller123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Route passes all filter params - searchParams.get() returns null (not undefined) when param doesn't exist
    expect(marketplaceModule.getListings).toHaveBeenCalledWith({
      assetType: null,
      sellerAddress: '0xseller123',
      minPrice: undefined,
      maxPrice: undefined,
    });
  });

  it('should filter by price range', async () => {
    const mockListings = [
      {
        id: 'listing-1',
        assetType: 'item',
        assetId: 'item-123',
        priceErc20: '1500000000000000000',
      },
    ];

    (marketplaceModule.getListings as any) = vi.fn().mockResolvedValue(mockListings);

    const request = new NextRequest('http://localhost/api/marketplace/listings?minPrice=1000000000000000000&maxPrice=2000000000000000000');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Route passes all filter params - searchParams.get() returns null (not undefined) when param doesn't exist
    expect(marketplaceModule.getListings).toHaveBeenCalledWith({
      assetType: null,
      sellerAddress: null,
      minPrice: '1000000000000000000',
      maxPrice: '2000000000000000000',
    });
  });

  it('should handle multiple filters', async () => {
    const mockListings: any[] = [];

    (marketplaceModule.getListings as any) = vi.fn().mockResolvedValue(mockListings);

    const request = new NextRequest('http://localhost/api/marketplace/listings?assetType=adventurer&sellerAddress=0xseller123&minPrice=1000000000000000000');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(marketplaceModule.getListings).toHaveBeenCalledWith({
      assetType: 'adventurer',
      sellerAddress: '0xseller123',
      minPrice: '1000000000000000000',
    });
  });

  it('should handle errors gracefully', async () => {
    (marketplaceModule.getListings as any) = vi.fn().mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/marketplace/listings');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Database error');
  });
});
