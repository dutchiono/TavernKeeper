import { NextRequest, NextResponse } from 'next/server';
import { joinParty } from '../../../../../lib/services/partyService';
import { verifyOwnership } from '../../../../../lib/services/heroOwnership';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await req.json();
        const { userId, heroTokenId, heroContract, userWallet } = body;

        if (!userId || !heroTokenId || !heroContract || !userWallet) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify ownership first
        const isOwner = await verifyOwnership(heroTokenId, heroContract, userWallet);
        if (!isOwner) {
            return NextResponse.json({ error: 'User does not own this hero' }, { status: 403 });
        }

        const success = await joinParty(id, userId, heroTokenId, heroContract);

        if (!success) {
            return NextResponse.json({ error: 'Failed to join party (full or not found)' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error joining party:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
