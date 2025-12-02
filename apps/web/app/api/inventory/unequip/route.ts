import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { monad } from '@/lib/chains';
import { unequipItem } from '@/lib/services/inventoryTransfer';
import { createTestnetWallet } from '@/lib/wallet/testnetWallet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      itemId,
      amount,
      adventurerContract,
      adventurerTokenId,
      tavernKeeperContract,
      tavernKeeperTokenId,
    } = body;

    if (!itemId || !adventurerContract || !adventurerTokenId || !tavernKeeperContract || !tavernKeeperTokenId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const inventoryContract = process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS as `0x${string}`;
    if (!inventoryContract) {
      return NextResponse.json(
        { error: 'Inventory contract not configured' },
        { status: 500 }
      );
    }

    // Create clients
    const publicClient = createPublicClient({
      chain: monad,
      transport: http(),
    });

    // Get wallet client from testnet private key or user's connected wallet
    const walletClient = createTestnetWallet();

    if (!walletClient) {
      return NextResponse.json(
        { error: 'Wallet not configured. Set TESTNET_PRIVATE_KEY in .env for testnet, or connect wallet for production.' },
        { status: 400 }
      );
    }

    const { txHash } = await unequipItem(
      monad.id,
      inventoryContract,
      BigInt(itemId),
      BigInt(amount || '1'),
      adventurerContract as `0x${string}`,
      BigInt(adventurerTokenId),
      tavernKeeperContract as `0x${string}`,
      BigInt(tavernKeeperTokenId),
      publicClient,
      walletClient
    );

    return NextResponse.json({ txHash, success: true });
  } catch (error) {
    console.error('Error unequipping item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unequip item' },
      { status: 500 }
    );
  }
}

