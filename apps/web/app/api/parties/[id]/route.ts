import { NextRequest, NextResponse } from 'next/server';
import { getParty, getPartyMembers, updateParty, deleteParty } from '../../../../lib/services/partyService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const party = await getParty(id);
    if (!party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const members = await getPartyMembers(id);

    return NextResponse.json({ ...party, members });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Implement update
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Implement delete
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
