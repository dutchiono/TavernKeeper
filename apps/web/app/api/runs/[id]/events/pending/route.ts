import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const now = new Date().toISOString();
    
    // Fetch all events for this run and filter in JavaScript
    // (Supabase JS client doesn't have a reliable .not() method)
    const { data: allEvents, error } = await supabase
      .from('world_events')
      .select('scheduled_delivery_time')
      .eq('run_id', id);

    if (error) {
      console.error(`[Events API] Error checking pending events for ${id}:`, error);
      return NextResponse.json({ error: 'Failed to check pending events' }, { status: 500 });
    }

    // Count events that are scheduled but not yet ready to deliver
    // (scheduled_delivery_time exists and is > now)
    const pendingCount = (allEvents || []).filter(event => {
      if (!event.scheduled_delivery_time) return false;
      return new Date(event.scheduled_delivery_time) > new Date(now);
    }).length;

    return NextResponse.json({ 
      pendingCount,
      hasPending: pendingCount > 0
    });
  } catch (error) {
    console.error('Error checking pending events:', error);
    return NextResponse.json(
      { error: 'Failed to check pending events' },
      { status: 500 }
    );
  }
}

