import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { monad } from '@/lib/chains';
import { buyItem } from '@/lib/services/marketplace';
import { createTestnetWallet, getTestnetWalletAddress } from '@/lib/wallet/testnetWallet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, buyerAddress } = body;

    if (!listingId || !buyerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: listingId, buyerAddress' },
        { status: 400 }
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

    // Use testnet wallet address if buyerAddress not provided
    const finalBuyerAddress = buyerAddress || getTestnetWalletAddress();
    if (!finalBuyerAddress) {
      return NextResponse.json(
        { error: 'Buyer address required' },
        { status: 400 }
      );
    }

    const { txHash } = await buyItem(
      listingId,
      finalBuyerAddress,
      monad.id,
      publicClient,
      walletClient
    );

    return NextResponse.json({ txHash, success: true });
  } catch (error) {
    console.error('Error buying item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to buy item' },
      { status: 500 }
    );
  }
}

