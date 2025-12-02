import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { monad } from '@/lib/chains';
import { listItem } from '@/lib/services/marketplace';
import { createTestnetWallet, getTestnetWalletAddress } from '@/lib/wallet/testnetWallet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      assetType,
      assetId,
      assetContract,
      priceErc20,
      includesInventory,
      metadata,
      sellerAddress,
    } = body;

    if (!assetType || !assetId || !assetContract || !priceErc20 || sellerAddress === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const erc20Token = process.env.NEXT_PUBLIC_KEEP_TOKEN_ADDRESS as `0x${string}`;
    const inventoryContract = process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS as `0x${string}`;

    if (!erc20Token || !inventoryContract) {
      return NextResponse.json(
        { error: 'Contract addresses not configured' },
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

    // Use testnet wallet address if sellerAddress not provided
    const finalSellerAddress = sellerAddress || getTestnetWalletAddress();
    if (!finalSellerAddress) {
      return NextResponse.json(
        { error: 'Seller address required' },
        { status: 400 }
      );
    }

    const { listingId, poolAddress, txHash } = await listItem(
      {
        assetType: assetType as 'item' | 'adventurer' | 'tavernkeeper',
        assetId,
        assetContract: assetContract as `0x${string}`,
        priceErc20,
        includesInventory: includesInventory || false,
        metadata,
      },
      sellerAddress as `0x${string}`,
      monad.id,
      erc20Token,
      inventoryContract,
      publicClient,
      walletClient
    );

    return NextResponse.json({
      listingId,
      poolAddress,
      txHash,
      success: true,
    });
  } catch (error) {
    console.error('Error listing item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list item' },
      { status: 500 }
    );
  }
}

