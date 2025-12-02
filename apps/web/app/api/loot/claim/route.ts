import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { monad } from '@/lib/chains';
import { getLootClaim, claimLoot, estimateClaimGas } from '@/lib/services/lootClaim';
import { createTestnetWallet } from '@/lib/wallet/testnetWallet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimId, chainId } = body;

    if (!claimId) {
      return NextResponse.json(
        { error: 'Missing required field: claimId' },
        { status: 400 }
      );
    }

    // Get chain config
    const chain = monad;

    // Create public client
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Get wallet client from testnet private key or user's connected wallet
    // For testnet: use TESTNET_PRIVATE_KEY from env
    // For production: get from user's connected wallet via wagmi
    const walletClient = createTestnetWallet();

    if (!walletClient) {
      return NextResponse.json(
        { error: 'Wallet not configured. Set TESTNET_PRIVATE_KEY in .env for testnet, or connect wallet for production.' },
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

    const { txHash } = await claimLoot(
      claimId,
      publicClient,
      walletClient,
      chain.id,
      inventoryContract
    );

    return NextResponse.json({ txHash, success: true });
  } catch (error) {
    console.error('Error claiming loot:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to claim loot' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('claimId');
    const action = searchParams.get('action'); // 'estimate' or 'info'

    if (!claimId) {
      return NextResponse.json(
        { error: 'Missing required parameter: claimId' },
        { status: 400 }
      );
    }

    const chain = monad;
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const inventoryContract = process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS as `0x${string}`;
    if (!inventoryContract) {
      return NextResponse.json(
        { error: 'Inventory contract not configured' },
        { status: 500 }
      );
    }

    if (action === 'estimate') {
      const estimate = await estimateClaimGas(claimId, publicClient, chain.id, inventoryContract);
      return NextResponse.json({
        gasLimit: estimate.gasLimit.toString(),
        gasPrice: estimate.gasPrice.toString(),
        totalCost: estimate.totalCost.toString(),
        totalCostEth: estimate.totalCostEth,
        protocolFee: estimate.protocolFee.toString(),
        protocolFeeEth: estimate.protocolFeeEth,
      });
    } else {
      // Get claim info
      const claim = await getLootClaim(claimId);
      if (!claim) {
        return NextResponse.json(
          { error: 'Claim not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(claim);
    }
  } catch (error) {
    console.error('Error fetching loot claim:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch claim' },
      { status: 500 }
    );
  }
}

