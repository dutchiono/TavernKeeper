import { createPublicClient, http, parseAbiItem } from 'viem';
import { monad } from '../wagmi';
import { supabase } from '../supabase';
import { CONTRACT_REGISTRY, getContractAddress } from '../contracts/registry';
import { metadataStorage } from './metadataStorage';

const publicClient = createPublicClient({
    chain: monad,
    transport: http(),
});

export async function verifyOwnership(
    tokenId: string,
    contractAddress: string,
    ownerAddress: string
): Promise<boolean> {
    try {
        const contractConfig = CONTRACT_REGISTRY.ADVENTURER;
        // Ensure we are checking against the correct contract if passed, or default to registry
        // For now, assuming contractAddress matches registry or we use registry's ABI

        const owner = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: contractConfig.abi,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)],
        }) as string;

        return owner.toLowerCase() === ownerAddress.toLowerCase();
    } catch (error) {
        console.error('Error verifying ownership:', error);
        return false;
    }
}

export async function syncUserHeroes(walletAddress: string) {
    try {
        const contractConfig = CONTRACT_REGISTRY.ADVENTURER;
        const contractAddress = getContractAddress(contractConfig);

        if (!contractAddress) throw new Error("Adventurer contract not found");

        // 1. Get all Transfer events to/from the user
        // We scan both to and from to build the current set, or just scan 'to' and verify ownership.
        // Scanning 'to' and verifying ownership is safer against transfers away that we might miss if we only scan 'from' in a limited range?
        // Actually, scanning 'to' gives us all tokens they EVER received.
        // Then we check ownerOf for each. This handles transfers away perfectly (ownerOf will be someone else).

        const logs = await publicClient.getLogs({
            address: contractAddress as `0x${string}`,
            event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
            args: {
                to: walletAddress as `0x${string}`,
            },
            fromBlock: 'earliest',
        });

        const tokenIds = new Set<string>();
        logs.forEach(log => {
            if (log.args.tokenId !== undefined) {
                tokenIds.add(log.args.tokenId.toString());
            }
        });

        // 2. Verify current ownership and fetch metadata
        const syncedHeroes = [];
        for (const tokenId of Array.from(tokenIds)) {
            try {
                const owner = await publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: contractConfig.abi,
                    functionName: 'ownerOf',
                    args: [BigInt(tokenId)],
                }) as string;

                if (owner.toLowerCase() === walletAddress.toLowerCase()) {
                    // User still owns it. Fetch metadata.
                    const uri = await publicClient.readContract({
                        address: contractAddress as `0x${string}`,
                        abi: contractConfig.abi,
                        functionName: 'tokenURI',
                        args: [BigInt(tokenId)],
                    }) as string;

                    let metadata: any = {};
                    try {
                        const httpUrl = metadataStorage.getHttpUrl(uri);
                        if (httpUrl.startsWith('http')) {
                            const res = await fetch(httpUrl);
                            if (res.ok) metadata = await res.json();
                        } else if (httpUrl.startsWith('data:')) {
                            const base64 = httpUrl.split(',')[1];
                            if (base64) {
                                metadata = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
                            }
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch metadata for ${tokenId}`, e);
                    }

                    const heroData = {
                        token_id: tokenId,
                        contract_address: contractAddress,
                        owner_address: walletAddress.toLowerCase(),
                        name: metadata.name || `Hero #${tokenId}`,
                        image_uri: metadata.image || '',
                        attributes: metadata.attributes || [],
                        updated_at: new Date().toISOString(),
                    };

                    // Upsert into heroes table
                    const { error } = await supabase
                        .from('heroes')
                        .upsert(heroData, { onConflict: 'token_id,contract_address' })
                        .select()
                        .single();

                    if (error) {
                        console.error('Error upserting hero:', error);
                    } else {
                        syncedHeroes.push(heroData);
                    }
                }
            } catch (e) {
                // Token might be burned or error
                console.warn(`Could not check ownership for token ${tokenId}`, e);
            }
        }

        return syncedHeroes.map(h => h.token_id);
    } catch (error) {
        console.error('Error syncing user heroes:', error);
        throw error;
    }
}

