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
        const { data, error } = await supabase
            .from('heroes')
            .select('*')
            .eq('owner_address', userId.toLowerCase());

        if (error) {
            console.error('Error fetching heroes:', error);
            return NextResponse.json({ error: 'Failed to fetch heroes' }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
