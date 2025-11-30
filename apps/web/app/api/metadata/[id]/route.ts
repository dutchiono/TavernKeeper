import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const { data, error } = await supabase
        .from('hero_metadata')
        .select('metadata')
        .eq('id', id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
    }

    return NextResponse.json(data.metadata);
}
