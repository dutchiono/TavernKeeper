import { supabase } from '../supabase';

export interface HeroMetadata {
    name: string;
    description: string;
    image: string;
    attributes: { trait_type: string; value: string | number }[];
    hero: {
        class: string;
        colorPalette: {
            skin: string;
            hair: string;
            clothing: string;
            accent: string;
        };
        spriteSheet: string;
        animationFrames: Record<string, number[]>;
    };
}

export async function fetchAndCacheMetadata(tokenId: string, tokenUri: string): Promise<HeroMetadata | null> {
    try {
        // 1. Fetch JSON from URI
        // Handle IPFS URIs if needed
        const url = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch metadata from ${url}`);
        }

        const metadata = await response.json() as HeroMetadata;

        // 2. Cache in database
        // We update the hero_ownership table
        const { error } = await supabase
            .from('hero_ownership')
            .update({
                metadata: metadata,
            })
            .eq('token_id', tokenId);

        if (error) {
            console.error('Error caching metadata:', error);
        }

        return metadata;
    } catch (error) {
        console.error('Error fetching/caching metadata:', error);
        return null;
    }
}

export async function getHeroMetadata(tokenId: string): Promise<HeroMetadata | null> {
    // 1. Try to get from DB cache
    const { data, error } = await supabase
        .from('hero_ownership')
        .select('metadata')
        .eq('token_id', tokenId)
        .single();

    if (data?.metadata) {
        return data.metadata as HeroMetadata;
    }

    // 2. If not in cache, we should have the URI from syncUserHeroes or elsewhere
    // But here we might need to fetch it from contract if we don't have the URI
    // For now, return null or implement contract fetch if needed.
    // Assuming syncUserHeroes runs first and populates the row, but maybe not the metadata column yet if we didn't fetch it there.

    return null;
}
