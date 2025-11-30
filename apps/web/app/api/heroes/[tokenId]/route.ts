import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { monad } from '../../../../lib/wagmi';
import { CONTRACT_REGISTRY, getContractAddress } from '../../../../lib/contracts/registry';

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

        // Fetch owner and URI
        const [owner, uri] = await Promise.all([
            publicClient.readContract({
                address: contractAddress,
                abi: contractConfig.abi,
                functionName: 'ownerOf',
                args: [BigInt(tokenId)],
            }),
            publicClient.readContract({
                address: contractAddress,
                abi: contractConfig.abi,
                functionName: 'tokenURI',
                args: [BigInt(tokenId)],
            })
        ]);

        // Fetch metadata from URI (if it's an HTTP URL)
        let metadata = {};
        if (typeof uri === 'string' && uri.startsWith('http')) {
            try {
                const response = await fetch(uri);
                metadata = await response.json();
            } catch (e) {
                console.error('Failed to fetch metadata:', e);
            }
        }

        return NextResponse.json({
            tokenId,
            owner,
            uri,
            metadata
        });
    } catch (error: any) {
        console.error('Error fetching hero:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch hero' },
            { status: 500 }
        );
    }
}
