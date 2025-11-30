import { NextResponse } from 'next/server';
import { CONTRACT_REGISTRY, getContractAddress } from '../../../../../lib/contracts/registry';
import { metadataStorage } from '../../../../../lib/services/metadataStorage';
import { heroMinting } from '../../../../../lib/services/heroMinting';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ tokenId: string }> }
) {
    try {
        const body = await request.json();
        const { colorPalette, name, heroClass } = body;
        const { tokenId } = await params;

        if (!colorPalette || !name || !heroClass) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 1. Generate new metadata
        const metadata = heroMinting.generateMetadata({
            name,
            class: heroClass,
            colorPalette
        });

        // 2. Upload new metadata
        const newUri = await metadataStorage.upload(metadata);

        // 3. Update contract
        const contractConfig = CONTRACT_REGISTRY.ADVENTURER;
        const contractAddress = getContractAddress(contractConfig);

        if (!contractAddress) {
            throw new Error('Adventurer contract address not found');
        }

        // Note: This requires the backend wallet to be the owner OR the user to sign it.
        // If this is a user action, we should probably return the calldata or let the frontend handle the transaction.
        // However, for this API route, we'll assume the frontend is calling it to get the metadata URI, 
        // OR if we are using a relayer.
        // Given the context, it's better if the frontend handles the transaction directly.
        // But if we MUST do it here, we need a wallet.

        // Actually, looking at the implementation plan:
        // "Update hero color (update metadata URI)"
        // If we want the USER to pay gas, the frontend should do it.
        // If we want the SERVER to pay gas (meta-tx), we need a relayer.

        // For now, let's return the new URI so the frontend can call updateTokenURI.
        return NextResponse.json({ success: true, metadataUri: newUri });

    } catch (error: any) {
        console.error('Error updating hero color:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update hero color' },
            { status: 500 }
        );
    }
}
