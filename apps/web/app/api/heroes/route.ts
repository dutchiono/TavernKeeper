import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID (wallet address) is required' }, { status: 400 });
        }

        // Get heroes from heroes table
        // userId is treated as owner_address
        const { data: heroes, error } = await supabase
            .from('heroes')
            .select('*')
            .eq('owner_address', userId.toLowerCase());

        if (error) {
            console.error('Error fetching heroes:', error);
            return NextResponse.json({
                error: 'Failed to fetch heroes',
                details: error.message,
                code: error.code
            }, { status: 500 });
        }

        if (!heroes || heroes.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch hero states
        const tokenIds = heroes.map((h: any) => h.token_id);
        console.log(`[Heroes API] Fetching states for ${tokenIds.length} heroes`);
        let states: any[] = [];
        try {
            const { data, error: stateError } = await supabase
                .from('hero_states')
                .select('*')
                .in('token_id', tokenIds);

            if (stateError) {
                console.error('[Heroes API] Error fetching hero states:', stateError);
                // Proceed with usage of default states
            } else {
                states = data || [];
            }
        } catch (e) {
            console.error('[Heroes API] Exception fetching states:', e);
        }

        // Merge states
        const heroesWithState = heroes.map((hero: any) => {
            const state = states?.find((s: any) => s.token_id === hero.token_id);
            const now = new Date();
            const lockedUntil = state?.locked_until ? new Date(state.locked_until) : null;
            const isLocked = state?.status === 'dungeon' && lockedUntil && lockedUntil > now;

            return {
                ...hero,
                status: isLocked ? 'dungeon' : 'idle',
                lockedUntil: isLocked ? state.locked_until : null,
                currentRunId: isLocked ? state.current_run_id : null
            };
        });

        return NextResponse.json(heroesWithState);
    } catch (error: any) {
        console.error('[Heroes API] Critical Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tokenIds } = body;

        if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
            return NextResponse.json([]);
        }

        console.log(`[Heroes API] Fetching states for ${tokenIds.length} heroes (POST)`);

        const { data, error } = await supabase
            .from('hero_states')
            .select('*')
            .in('token_id', tokenIds);

        if (error) {
            console.error('[Heroes API] Error fetching hero states:', error);
            // Return empty array on error to not block UI
            return NextResponse.json([], { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('[Heroes API] Critical Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
