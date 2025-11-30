import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: partyId } = await params;
        const body = await request.json();
        const { heroTokenId } = body;

        if (!partyId || !heroTokenId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Remove member from party
        const { error } = await supabase
            .from('party_members')
            .delete()
            .eq('party_id', partyId)
            .eq('hero_token_id', heroTokenId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error leaving party:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to leave party' },
            { status: 500 }
        );
    }
}
