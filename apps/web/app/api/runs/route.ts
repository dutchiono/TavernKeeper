import { NextRequest, NextResponse } from 'next/server';
import { runQueue } from '@/lib/queue';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dungeonId, party, seed } = body;

    if (!dungeonId || !party || !Array.isArray(party) || party.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: dungeonId, party (array)' },
        { status: 400 }
      );
    }

    // Create run record
    const { data: run, error } = await supabase
      .from('runs')
      .insert({
        dungeon_id: dungeonId,
        party,
        seed: seed || `run-${Date.now()}`,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !run) {
      throw error || new Error('Failed to create run');
    }

    // Enqueue simulation job
    await runQueue.add('simulate-run', {
      runId: run.id,
      dungeonId,
      party,
      seed: run.seed as string,
      startTime: new Date(run.start_time as string).getTime(),
    });

    return NextResponse.json({ id: run.id, status: 'queued' });
  } catch (error) {
    console.error('Error creating run:', error);
    return NextResponse.json(
      { error: 'Failed to create run' },
      { status: 500 }
    );
  }
}

