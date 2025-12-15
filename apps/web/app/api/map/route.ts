import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mapId = searchParams.get('id');

    if (!mapId) {
        // Return list of available dungeons
        try {
            const { data: dungeons, error } = await supabase
                .from('dungeons')
                .select('id, seed, map')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error fetching dungeons:', error);
                return NextResponse.json(
                    { error: 'Failed to fetch dungeons' },
                    { status: 500 }
                );
            }

            const maps = (dungeons || []).map((d: any) => ({
                id: d.id,
                seed: d.seed,
                name: d.map?.name || `Dungeon ${d.seed}`,
            }));

            return NextResponse.json({ maps });
        } catch (error) {
            console.error('Error loading maps:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }

    try {
        // Fetch dungeon from database
        const { data: dungeon, error } = await supabase
            .from('dungeons')
            .select('*')
            .eq('id', mapId)
            .single();

        if (error || !dungeon) {
            return NextResponse.json({ error: 'Map not found' }, { status: 404 });
        }

        // Extract map data and convert to the expected format
        const dungeonMap = dungeon.map as any;

        // Convert dungeon levelLayout to the room-based format expected by MapScene
        // The dungeon has a levelLayout array with pre-generated rooms
        const rooms: Array<{ id: string; type: 'room' | 'corridor' | 'chamber' | 'boss'; connections: string[] }> = [];

        const levelLayout = dungeonMap?.levelLayout || [];
        const depth = dungeonMap?.depth || levelLayout.length || 100;

        // Determine boss levels from levelLayout
        const bossLevels = new Set<number>();
        if (dungeonMap?.finalBoss) {
            bossLevels.add(depth); // Final boss at bottom
        }
        if (dungeonMap?.midBosses && Array.isArray(dungeonMap.midBosses)) {
            dungeonMap.midBosses.forEach((boss: any) => {
                if (boss.level) {
                    bossLevels.add(boss.level);
                }
            });
        }

        // Also check levelLayout entries for bosses
        levelLayout.forEach((layout: any) => {
            if (layout.boss && layout.level) {
                bossLevels.add(layout.level);
            }
        });

        // Create rooms from levelLayout (limit to reasonable number for visualization)
        const maxRooms = Math.min(depth, 20); // Show up to 20 levels for visualization

        for (let i = 1; i <= maxRooms; i++) {
            const roomId = `level-${i}`;
            const connections: string[] = [];

            // Sequential connections (each level connects to next)
            if (i > 1) {
                connections.push(`level-${i - 1}`);
            }
            if (i < maxRooms) {
                connections.push(`level-${i + 1}`);
            }

            // Determine room type from levelLayout or defaults
            let roomType: 'room' | 'corridor' | 'chamber' | 'boss' = 'room';

            // Check if this level has a boss
            if (bossLevels.has(i)) {
                roomType = 'boss';
            } else {
                // Check levelLayout for room type
                const layoutEntry = levelLayout.find((l: any) => l.level === i);
                if (layoutEntry?.room) {
                    const roomTypeFromLayout = layoutEntry.room.type;
                    // Map RoomType to MapScene room type
                    if (roomTypeFromLayout === 'boss' || roomTypeFromLayout === 'mid_boss') {
                        roomType = 'boss';
                    } else if (roomTypeFromLayout === 'treasure') {
                        roomType = 'chamber';
                    } else if (roomTypeFromLayout === 'safe') {
                        roomType = 'chamber';
                    } else if (roomTypeFromLayout === 'combat' || roomTypeFromLayout === 'trap') {
                        roomType = 'room';
                    }
                }
            }

            rooms.push({
                id: roomId,
                type: roomType,
                connections,
            });
        }

        return NextResponse.json({
            id: dungeon.id,
            name: dungeonMap?.name || `Dungeon ${dungeon.seed}`,
            description: dungeonMap?.description,
            geographyType: dungeonMap?.theme?.name || dungeonMap?.theme?.id || 'unknown',
            rooms,
        });
    } catch (error) {
        console.error('Error loading map:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
