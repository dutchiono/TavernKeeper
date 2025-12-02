/**
 * Hero Minting Service
 * Handles the process of creating and minting new heroes
 */

import { metadataStorage } from './metadataStorage';
import { spriteRenderer, type ColorPalette } from './spriteRenderer';

export interface HeroMintData {
    name: string;
    class: string;
    colorPalette: ColorPalette;
}

export interface HeroMetadata {
    name: string;
    description: string;
    image: string;
    attributes: { trait_type: string; value: string | number }[];
    hero: {
        class: string;
        colorPalette: ColorPalette;
        spriteSheet: string;
        animationFrames: Record<string, number[]>;
    };
}

/**
 * Generate metadata JSON for a hero
 */
export const generateMetadata = (data: HeroMintData): Record<string, unknown> => {
    return {
        name: data.name,
        description: `A ${data.class} adventurer in the InnKeeper world.`,
        image: spriteRenderer.getSpriteUrl(data.class, 'idle'), // Base image
        attributes: [
            { trait_type: "Class", value: data.class },
            { trait_type: "Level", value: 1 }
        ],
        hero: {
            class: data.class,
            colorPalette: data.colorPalette,
            spriteSheet: data.class.toLowerCase(),
            animationFrames: {
                idle: [0, 1, 2, 3],
                walk: [4, 5, 6, 7],
                emote: [8],
                talk: [9, 10]
            }
        }
    };
};

/**
 * Upload metadata to storage
 */
export const uploadMetadata = async (metadata: Record<string, unknown>): Promise<string> => {
    return await metadataStorage.upload(metadata);
};

/**
 * Mint a new hero with signature-based pricing
 * Supports both client-side (injected wallet) and server-side (testnet wallet) minting.
 */
export const mintHero = async (
    walletClient: any, // viem WalletClient or similar
    walletAddress: string,
    metadataUri: string,
    tier?: 1 | 2 | 3
): Promise<string> => {
    // Use rpgService for signature-based minting
    const { rpgService } = await import('./rpgService');
    return await rpgService.mintHero(walletClient, walletAddress, walletAddress, metadataUri, tier);
};

// Default export object for backward compatibility with API routes if they used it
export const heroMinting = {
    generateMetadata,
    mintHero: async (walletAddress: string, data: HeroMintData, injectedWalletClient?: any) => {
        const metadata = generateMetadata(data);
        const metadataUri = await uploadMetadata(metadata);

        let walletClient = injectedWalletClient;
        if (!walletClient) {
            const { createTestnetWallet } = await import('../wallet/testnetWallet');
            walletClient = createTestnetWallet();
        }

        return mintHero(walletClient, walletAddress, metadataUri);
    }
};

