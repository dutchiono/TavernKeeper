import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const { data: dungeon, error } = await supabase
      .from('dungeons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !dungeon) {
      return NextResponse.json(
        { error: 'Dungeon not found' },
        { status: 404 }
      );
    }

    // Type assertion to ensure dungeon is a single object, not an array
    const dungeonData = dungeon as { id: string; seed: string; map: unknown };

    return NextResponse.json({
      id: dungeonData.id,
      seed: dungeonData.seed,
      map: dungeonData.map,
    });
  } catch (error) {
    console.error('Error fetching dungeon map:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dungeon map' },
      { status: 500 }
    );
  }
}

