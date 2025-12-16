import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID (wallet address) is required' }, { status: 400 });
        }

        // Get heroes from heroes table
        // userId is treated as owner_address
        const { data: heroes, error } = await supabase
            .from('heroes')
            .select('*')
            .eq('owner_address', userId.toLowerCase());

        if (error) {
            console.error('Error fetching heroes:', error);
            return NextResponse.json({
                error: 'Failed to fetch heroes',
                details: error.message,
                code: error.code
            }, { status: 500 });
        }

        if (!heroes || heroes.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch hero states
        const tokenIds = heroes.map((h: any) => h.token_id);
        console.log(`[Heroes API] Fetching states for ${tokenIds.length} heroes`);
        let states: any[] = [];
        try {
            const { data, error: stateError } = await supabase
                .from('hero_states')
                .select('*')
                .in('token_id', tokenIds);

            if (stateError) {
                console.error('[Heroes API] Error fetching hero states:', stateError);
                // Proceed with usage of default states
            } else {
                states = data || [];
            }
        } catch (e) {
            console.error('[Heroes API] Exception fetching states:', e);
        }

        // CRITICAL: Fetch fresh metadata from metadata_uri (or contract if missing) to ensure correct name/class
        // This fixes the issue where heroes were synced with default names but metadata exists on-chain
        const heroesWithFreshMetadata = await Promise.all(heroes.map(async (hero: any) => {
            let metadataUri = hero.metadata_uri;

            // If hero doesn't have metadata_uri stored, fetch it from contract
            if (!metadataUri) {
                try {
                    const { createPublicClient, http } = await import('viem');
                    const { monad } = await import('../../../lib/chains');
                    const { CONTRACT_REGISTRY, getContractAddress } = await import('../../../lib/contracts/registry');

                    const contractConfig = CONTRACT_REGISTRY.ADVENTURER;
                    const contractAddress = getContractAddress(contractConfig);

                    if (contractAddress) {
                        const publicClient = createPublicClient({
                            chain: monad,
                            transport: http(monad.rpcUrls.default.http[0]),
                        });

                        metadataUri = await publicClient.readContract({
                            address: contractAddress as `0x${string}`,
                            abi: contractConfig.abi,
                            functionName: 'tokenURI',
                            args: [BigInt(hero.token_id)],
                        }) as string;

                        console.log(`[Heroes API] Fetched metadata_uri from contract for hero ${hero.token_id}: ${metadataUri.substring(0, 50)}...`);
                    }
                } catch (contractError) {
                    console.warn(`[Heroes API] Failed to fetch metadata_uri from contract for hero ${hero.token_id}:`, contractError);
                }
            }

            // If we have metadata_uri (either stored or fetched), get fresh metadata
            if (metadataUri) {
                try {
                    const { metadataStorage } = await import('../../../lib/services/metadataStorage');
                    const httpUrl = metadataStorage.getHttpUrl(metadataUri);

                    let freshMetadata: any = null;
                    if (httpUrl.startsWith('http')) {
                        const res = await fetch(httpUrl);
                        if (res.ok) freshMetadata = await res.json();
                    } else if (httpUrl.startsWith('data:')) {
                        const base64 = httpUrl.split(',')[1];
                        if (base64) {
                            freshMetadata = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
                        }
                    }

                    // If we got fresh metadata, use it to update name and attributes
                    if (freshMetadata) {
                        console.log(`[Heroes API] ✅ Fresh metadata for hero ${hero.token_id}: name="${freshMetadata.name}", class="${freshMetadata.hero?.class || freshMetadata.attributes?.find((a: any) => a.trait_type === 'Class')?.value || 'unknown'}"`);
                        return {
                            ...hero,
                            name: freshMetadata.name || hero.name, // Use fresh name if available
                            attributes: freshMetadata.attributes || hero.attributes, // Use fresh attributes if available
                            metadata_uri: metadataUri, // Store URI if we fetched it
                            // Store full metadata for client use
                            metadata: freshMetadata
                        };
                    }
                } catch (metadataError) {
                    console.warn(`[Heroes API] Failed to fetch fresh metadata for hero ${hero.token_id}:`, metadataError);
                    // Continue with stored hero data if fetch fails
                }
            }

            return hero;
        }));

        // Merge states
        const heroesWithState = heroesWithFreshMetadata.map((hero: any) => {
            const state = states?.find((s: any) => s.token_id === hero.token_id);
            const now = new Date();
            const lockedUntil = state?.locked_until ? new Date(state.locked_until) : null;
            const isLocked = state?.status === 'dungeon' && lockedUntil && lockedUntil > now;

            return {
                ...hero,
                status: isLocked ? 'dungeon' : 'idle',
                lockedUntil: isLocked ? state.locked_until : null,
                currentRunId: isLocked ? state.current_run_id : null
            };
        });

        return NextResponse.json(heroesWithState);
    } catch (error: any) {
        console.error('[Heroes API] Critical Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tokenIds } = body;

        if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
            return NextResponse.json([]);
        }

        console.log(`[Heroes API] Fetching states for ${tokenIds.length} heroes (POST)`);

        const { data, error } = await supabase
            .from('hero_states')
            .select('*')
            .in('token_id', tokenIds);

        if (error) {
            console.error('[Heroes API] Error fetching hero states:', error);
            // Return empty array on error to not block UI
            return NextResponse.json([], { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('[Heroes API] Critical Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
