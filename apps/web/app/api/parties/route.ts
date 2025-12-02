import { NextRequest, NextResponse } from 'next/server';
import { createParty, getUserParties } from '../../../lib/services/partyService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, dungeonId, initialHeroTokenIds } = body;

        if (!ownerId) {
            return NextResponse.json({ error: 'Owner ID is required' }, { status: 400 });
        }

        const party = await createParty(ownerId, dungeonId, initialHeroTokenIds);

        if (!party) {
            return NextResponse.json({ error: 'Failed to create party' }, { status: 500 });
        }

        return NextResponse.json(party);
    } catch (error) {
        console.error('Error in POST /api/parties:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const parties = await getUserParties(userId);
        return NextResponse.json(parties);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
