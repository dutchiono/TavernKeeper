import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;

    // 1. Find invite
    const { data: invite, error: inviteError } = await supabase
        .from('party_invites')
        .select('*, parties(*)')
        .eq('code', code.toUpperCase())
        .single();

    if (inviteError || !invite) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // 2. Check expiration
    if (new Date(invite.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }

    // 3. Check usage limit
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
        return NextResponse.json({ error: 'Invite limit reached' }, { status: 410 });
    }

    // Return party info
    return NextResponse.json({
        party: invite.parties,
        invite: {
            code: invite.code,
            expires_at: invite.expires_at
        }
    });
}
