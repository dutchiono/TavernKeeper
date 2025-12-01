/**
 * Hero Minting Service
 * Handles the process of creating and minting new heroes
 */

import { createPublicClient, http } from 'viem';
import { CONTRACT_REGISTRY, getContractAddress } from '../contracts/registry';
import { metadataStorage } from './metadataStorage';
import { spriteRenderer, type ColorPalette } from './spriteRenderer';
import { monad } from '../chains';

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
 * Mint a new hero
 * Supports both client-side (injected wallet) and server-side (testnet wallet) minting.
 */
export const mintHero = async (
    walletClient: any, // viem WalletClient or similar
    walletAddress: string,
    metadataUri: string
): Promise<string> => {
    const contractConfig = CONTRACT_REGISTRY.ADVENTURER;
    const contractAddress = getContractAddress(contractConfig);

    if (!contractAddress) {
        throw new Error('Adventurer contract address not found');
    }

    const publicClient = createPublicClient({
        chain: monad,
        transport: http(),
    });

    const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: contractConfig.abi,
        functionName: 'mintHero',
        args: [walletAddress, metadataUri],
        chain: monad,
        account: walletClient.account,
    });

    // Wait for transaction
    await publicClient.waitForTransactionReceipt({ hash });

    return hash;
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

