import { NextRequest, NextResponse } from 'next/server';
import { generateInviteCode } from '../../../../../lib/services/partyService';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const body = await req.json();
        const { userId } = body; // Need userId to know who created it

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const code = await generateInviteCode(id, userId);

        if (!code) {
            return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 });
        }

        return NextResponse.json({ code });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
