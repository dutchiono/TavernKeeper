import { NextRequest, NextResponse } from 'next/server';
import { startRun } from '../../../../../lib/services/partyService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await req.json();
        const { dungeonId } = body;

        if (!dungeonId) {
            return NextResponse.json({ error: 'Dungeon ID is required' }, { status: 400 });
        }

        const success = await startRun(id, dungeonId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to start run' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
