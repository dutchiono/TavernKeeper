import { NextRequest, NextResponse } from 'next/server';
import { getParty, getPartyMembers } from '../../../../../lib/services/partyService';
import { supabase } from '../../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const party = await getParty(id);
    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const members = await getPartyMembers(id);
    const allTokenIds = members.map(m => m.hero_token_id);

    // If party is in progress, find the associated run
    let runId: string | null = null;
    if (party.status === 'in_progress' && allTokenIds.length > 0) {
      // Find the most recent run with these party members
      const { data: runs } = await supabase
        .from('runs')
        .select('id')
        .contains('party', allTokenIds)
        .order('start_time', { ascending: false })
        .limit(1);

      if (runs && runs.length > 0) {
        runId = runs[0].id;
      }
    }

    return NextResponse.json({
      ...party,
      members,
      memberCount: members.length,
      isFull: members.length >= party.max_members,
      runId,
    });
  } catch (error) {
    console.error('Error fetching party status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch party status' },
      { status: 500 }
    );
  }
}
