import { POST } from '@/app/api/marketplace/buy/route';
import * as marketplaceModule from '@/lib/services/marketplace';
import * as testnetWalletModule from '@/lib/wallet/testnetWallet';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/marketplace');
vi.mock('@/lib/wallet/testnetWallet');

describe('POST /api/marketplace/buy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should buy an item successfully', async () => {
    const mockResult = {
      txHash: '0xtx123',
    };

    (marketplaceModule.buyItem as any) = vi.fn().mockResolvedValue(mockResult);
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue({});
    (testnetWalletModule.getTestnetWalletAddress as any) = vi.fn().mockReturnValue('0xbuyer123');

    const request = new NextRequest('http://localhost/api/marketplace/buy', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'listing-123',
        buyerAddress: '0xbuyer123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.txHash).toBe('0xtx123');
    expect(marketplaceModule.buyItem).toHaveBeenCalled();
  });

  it('should return 400 if listingId is missing', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/buy', {
      method: 'POST',
      body: JSON.stringify({
        buyerAddress: '0xbuyer123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 if buyerAddress is missing', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/buy', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'listing-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 if wallet not configured', async () => {
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/marketplace/buy', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'listing-123',
        buyerAddress: '0xbuyer123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Wallet not configured');
  });

  it('should return 400 if buyerAddress not provided (validation happens before fallback)', async () => {
    // The route validates buyerAddress before using fallback
    // This is expected behavior - buyerAddress must be explicitly provided
    const request = new NextRequest('http://localhost/api/marketplace/buy', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'listing-123',
        // buyerAddress not provided - will fail validation
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should handle buy errors gracefully', async () => {
    (marketplaceModule.buyItem as any) = vi.fn().mockRejectedValue(new Error('Insufficient funds'));
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue({});
    (testnetWalletModule.getTestnetWalletAddress as any) = vi.fn().mockReturnValue('0xbuyer123');

    const request = new NextRequest('http://localhost/api/marketplace/buy', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'listing-123',
        buyerAddress: '0xbuyer123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Insufficient funds');
  });
});
