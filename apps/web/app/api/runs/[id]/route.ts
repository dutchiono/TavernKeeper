import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mock Mode Handling
  if (id.startsWith('mock-')) {
    return NextResponse.json({
      id,
      dungeon_id: 'abandoned-cellar',
      status: 'active',
      start_time: new Date().toISOString(),
      party: [],
      seed: 'mock-seed',
      runLogs: [],
      events: [],
      dungeon: {
        id: 'abandoned-cellar',
        name: 'Abandoned Cellar',
        description: 'A dark and damp cellar.',
        floor_count: 5
      }
    });
  }

  try {
    // Fetch run
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('*')
      .eq('id', id)
      .single();

    if (runError || !run) {
      console.error('Run not found:', id, runError);
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Fetch related data
    const [runLogs, events, dungeon] = await Promise.all([
      supabase
        .from('run_logs')
        .select('*')
        .eq('run_id', id)
        .order('timestamp', { ascending: true })
        .limit(100),
      supabase
        .from('world_events')
        .select('*')
        .eq('run_id', id)
        .order('timestamp', { ascending: true })
        .limit(100),
      supabase
        .from('dungeons')
        .select('*')
        .eq('id', run.dungeon_id)
        .single(),
    ]);

    return NextResponse.json({
      ...run,
      runLogs: runLogs.data || [],
      events: events.data || [],
      dungeon: dungeon.data || null,
    });
  } catch (error) {
    console.error('Error fetching run:', error);
    return NextResponse.json(
      { error: 'Failed to fetch run' },
      { status: 500 }
    );
  }
}
