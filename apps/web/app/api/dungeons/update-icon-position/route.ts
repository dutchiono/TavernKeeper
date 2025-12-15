import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/dungeons/update-icon-position
 * Update icon position for a dungeon
 */
export async function POST(request: NextRequest) {
  try {
    const { dungeonId, icon_x, icon_y } = await request.json();

    if (!dungeonId || icon_x === undefined || icon_y === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: dungeonId, icon_x, icon_y' },
        { status: 400 }
      );
    }

    // Validate position values (should be between 10 and 90)
    if (icon_x < 10 || icon_x > 90 || icon_y < 10 || icon_y > 90) {
      return NextResponse.json(
        { error: 'icon_x and icon_y must be between 10 and 90' },
        { status: 400 }
      );
    }

    // Fetch current dungeon to update map JSONB
    const { data: dungeon, error: fetchError } = await supabase
      .from('dungeons')
      .select('map')
      .eq('id', dungeonId)
      .single();

    if (fetchError || !dungeon) {
      return NextResponse.json(
        { error: 'Dungeon not found' },
        { status: 404 }
      );
    }

    // Update map JSONB with icon positions
    const updatedMap = {
      ...dungeon.map,
      icon_x,
      icon_y,
    };

    const { error: updateError } = await supabase
      .from('dungeons')
      .update({
        map: updatedMap,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dungeonId);

    if (updateError) {
      console.error('Error updating dungeon icon position:', updateError);
      return NextResponse.json(
        { error: 'Failed to update icon position' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, icon_x, icon_y },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in update-icon-position endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

