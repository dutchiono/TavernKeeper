import { NextRequest, NextResponse } from 'next/server';
import { CONTRACT_REGISTRY, getContractAddress } from '../../../../../lib/contracts/registry';
import { verifyOwnership } from '../../../../../lib/services/heroOwnership';
import { joinParty } from '../../../../../lib/services/partyService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await req.json();
        const { userId, heroTokenId, userWallet } = body;

        if (!userId || !heroTokenId || !userWallet) {
            return NextResponse.json({ error: 'Missing required fields: userId, heroTokenId, userWallet' }, { status: 400 });
        }

        // Get Adventurer contract address from registry
        const heroContract = getContractAddress(CONTRACT_REGISTRY.ADVENTURER);
        if (!heroContract) {
            return NextResponse.json({ error: 'Adventurer contract not configured' }, { status: 500 });
        }

        // Verify ownership first
        const isOwner = await verifyOwnership(heroTokenId, heroContract, userWallet);
        if (!isOwner) {
            return NextResponse.json({ error: 'User does not own this hero' }, { status: 403 });
        }

        const result = await joinParty(id, userId, heroTokenId, heroContract);

        if (!result.success) {
            return NextResponse.json({ error: 'Failed to join party (full or not found)' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error joining party:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
