import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { monad } from '../../../../../lib/wagmi';
import { CONTRACT_REGISTRY, getContractAddress } from '../../../../../lib/contracts/registry';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tokenId: string }> }
) {
    try {
        const { tokenId } = await params;

        if (!tokenId) {
            return NextResponse.json(
                { error: 'Missing token ID' },
                { status: 400 }
            );
        }

        const contractConfig = CONTRACT_REGISTRY.ADVENTURER;
        const contractAddress = getContractAddress(contractConfig);

        if (!contractAddress) {
            return NextResponse.json(
                { error: 'Contract not configured' },
                { status: 500 }
            );
        }

        const publicClient = createPublicClient({
            chain: monad,
            transport: http(),
        });

        const uri = await publicClient.readContract({
            address: contractAddress,
            abi: contractConfig.abi,
            functionName: 'tokenURI',
            args: [BigInt(tokenId)],
        });

        if (typeof uri !== 'string') {
            throw new Error('Invalid URI returned from contract');
        }

        // Fetch metadata
        // Handle data URIs
        if (uri.startsWith('data:application/json;base64,')) {
            const base64 = uri.replace('data:application/json;base64,', '');
            const json = Buffer.from(base64, 'base64').toString('utf-8');
            return NextResponse.json(JSON.parse(json));
        }

        // Handle HTTP URIs
        if (uri.startsWith('http')) {
            const response = await fetch(uri);
            const json = await response.json();
            return NextResponse.json(json);
        }

        // Handle IPFS URIs (mock)
        if (uri.startsWith('ipfs://')) {
            return NextResponse.json({
                error: 'IPFS gateway not configured',
                uri
            }, { status: 501 });
        }

        return NextResponse.json({ uri });

    } catch (error: any) {
        console.error('Error fetching hero metadata:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch hero metadata' },
            { status: 500 }
        );
    }
}
