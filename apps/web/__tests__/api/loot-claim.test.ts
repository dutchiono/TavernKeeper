import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/loot/claim/route';
import { NextRequest } from 'next/server';
import * as lootClaimModule from '@/lib/services/lootClaim';
import * as testnetWalletModule from '@/lib/wallet/testnetWallet';

vi.mock('@/lib/services/lootClaim');
vi.mock('@/lib/wallet/testnetWallet');

describe('POST /api/loot/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS = '0x0987654321098765432109876543210987654321';
  });

  it('should claim loot successfully', async () => {
    const mockResult = {
      txHash: '0xtx123',
    };

    (lootClaimModule.claimLoot as any) = vi.fn().mockResolvedValue(mockResult);
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue({});

    const request = new NextRequest('http://localhost/api/loot/claim', {
      method: 'POST',
      body: JSON.stringify({
        claimId: 'claim-123',
        chainId: 10143,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.txHash).toBe('0xtx123');
    expect(lootClaimModule.claimLoot).toHaveBeenCalled();
  });

  it('should return 400 if claimId is missing', async () => {
    const request = new NextRequest('http://localhost/api/loot/claim', {
      method: 'POST',
      body: JSON.stringify({
        chainId: 10143,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required field');
  });

  it('should return 500 if inventory contract not configured', async () => {
    delete process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS;

    const request = new NextRequest('http://localhost/api/loot/claim', {
      method: 'POST',
      body: JSON.stringify({
        claimId: 'claim-123',
        chainId: 10143,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Inventory contract not configured');
  });

  it('should return 400 if wallet not configured', async () => {
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/loot/claim', {
      method: 'POST',
      body: JSON.stringify({
        claimId: 'claim-123',
        chainId: 10143,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Wallet not configured');
  });
});

describe('GET /api/loot/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS = '0x0987654321098765432109876543210987654321';
  });

  it('should get claim info', async () => {
    const mockClaim = {
      id: 'claim-123',
      adventurerId: 'adv-456',
      items: [{ name: 'Sword', type: 'weapon' }],
      claimed: false,
    };

    (lootClaimModule.getLootClaim as any) = vi.fn().mockResolvedValue(mockClaim);

    const request = new NextRequest('http://localhost/api/loot/claim?claimId=claim-123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockClaim);
    expect(lootClaimModule.getLootClaim).toHaveBeenCalledWith('claim-123');
  });

  it('should return 404 if claim not found', async () => {
    (lootClaimModule.getLootClaim as any) = vi.fn().mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/loot/claim?claimId=claim-123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Claim not found');
  });

  it('should return gas estimate when action=estimate', async () => {
    const mockEstimate = {
      gasLimit: BigInt('21000'),
      gasPrice: BigInt('20000000000'),
      totalCost: BigInt('420000000000000'),
      totalCostEth: '0.00042',
      protocolFee: BigInt('42000000000'),
      protocolFeeEth: '0.000042',
    };

    (lootClaimModule.estimateClaimGas as any) = vi.fn().mockResolvedValue(mockEstimate);

    const request = new NextRequest('http://localhost/api/loot/claim?claimId=claim-123&action=estimate');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.gasLimit).toBe('21000');
    expect(data.gasPrice).toBe('20000000000');
    expect(data.totalCost).toBe('420000000000000');
    expect(data.totalCostEth).toBe('0.00042');
    expect(data.protocolFee).toBe('42000000000');
    expect(data.protocolFeeEth).toBe('0.000042');
  });

  it('should return 400 if claimId is missing', async () => {
    const request = new NextRequest('http://localhost/api/loot/claim');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required parameter');
  });

  it('should return 500 if inventory contract not configured for estimate', async () => {
    delete process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS;

    const request = new NextRequest('http://localhost/api/loot/claim?claimId=claim-123&action=estimate');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Inventory contract not configured');
  });
});
