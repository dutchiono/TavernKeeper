import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/inventory/unequip/route';
import { NextRequest } from 'next/server';
import * as inventoryTransferModule from '@/lib/services/inventoryTransfer';
import * as testnetWalletModule from '@/lib/wallet/testnetWallet';

vi.mock('@/lib/services/inventoryTransfer');
vi.mock('@/lib/wallet/testnetWallet');

describe('POST /api/inventory/unequip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS = '0x0987654321098765432109876543210987654321';
  });

  it('should unequip an item successfully', async () => {
    const mockResult = {
      txHash: '0xtx123',
    };

    (inventoryTransferModule.unequipItem as any) = vi.fn().mockResolvedValue(mockResult);
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue({});

    const request = new NextRequest('http://localhost/api/inventory/unequip', {
      method: 'POST',
      body: JSON.stringify({
        itemId: '123',
        amount: '1',
        adventurerContract: '0xadv123',
        adventurerTokenId: '456',
        tavernKeeperContract: '0xtk123',
        tavernKeeperTokenId: '789',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.txHash).toBe('0xtx123');
    expect(inventoryTransferModule.unequipItem).toHaveBeenCalled();
  });

  it('should return 400 if required fields are missing', async () => {
    const request = new NextRequest('http://localhost/api/inventory/unequip', {
      method: 'POST',
      body: JSON.stringify({
        itemId: '123',
        // Missing other required fields
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 500 if inventory contract not configured', async () => {
    delete process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS;

    const request = new NextRequest('http://localhost/api/inventory/unequip', {
      method: 'POST',
      body: JSON.stringify({
        itemId: '123',
        amount: '1',
        adventurerContract: '0xadv123',
        adventurerTokenId: '456',
        tavernKeeperContract: '0xtk123',
        tavernKeeperTokenId: '789',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Inventory contract not configured');
  });

  it('should return 400 if wallet not configured', async () => {
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/inventory/unequip', {
      method: 'POST',
      body: JSON.stringify({
        itemId: '123',
        amount: '1',
        adventurerContract: '0xadv123',
        adventurerTokenId: '456',
        tavernKeeperContract: '0xtk123',
        tavernKeeperTokenId: '789',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Wallet not configured');
  });

  it('should default amount to 1 if not provided', async () => {
    const mockResult = {
      txHash: '0xtx123',
    };

    (inventoryTransferModule.unequipItem as any) = vi.fn().mockResolvedValue(mockResult);
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue({});

    const request = new NextRequest('http://localhost/api/inventory/unequip', {
      method: 'POST',
      body: JSON.stringify({
        itemId: '123',
        // amount not provided
        adventurerContract: '0xadv123',
        adventurerTokenId: '456',
        tavernKeeperContract: '0xtk123',
        tavernKeeperTokenId: '789',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(inventoryTransferModule.unequipItem).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(String),
      BigInt('123'),
      BigInt('1'), // Default amount
      expect.any(String),
      expect.any(BigInt),
      expect.any(String),
      expect.any(BigInt),
      expect.anything(),
      expect.anything()
    );
  });

  it('should handle errors gracefully', async () => {
    (inventoryTransferModule.unequipItem as any) = vi.fn().mockRejectedValue(new Error('Item not equipped'));
    (testnetWalletModule.createTestnetWallet as any) = vi.fn().mockReturnValue({});

    const request = new NextRequest('http://localhost/api/inventory/unequip', {
      method: 'POST',
      body: JSON.stringify({
        itemId: '123',
        amount: '1',
        adventurerContract: '0xadv123',
        adventurerTokenId: '456',
        tavernKeeperContract: '0xtk123',
        tavernKeeperTokenId: '789',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Item not equipped');
  });
});
