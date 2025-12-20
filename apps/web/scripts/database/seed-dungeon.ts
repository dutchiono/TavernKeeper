
import dotenv from 'dotenv';
import path from 'path';

const rootEnvPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: rootEnvPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_API_KEY;

async function seed() {
    const url = `${supabaseUrl}/rest/v1/dungeons`;
    const headers = {
        'apikey': supabaseKey as string,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    const dungeonData = {
        seed: 'abandoned-cellar', // This will be our lookup key
        map: {
            id: 'abandoned-cellar', // CRITICAL FIX: Missing ID caused worker to fail loading map
            name: 'Abandoned Cellar',
            description: 'A dark and damp cellar, filled with rats and old barrels.',
            image_url: '/assets/dungeons/cellar.png',
            level_requirement: 1,
            max_level: 5,
            floors: 5
        }
    };

    console.log('🌱 Seeding/Updating "Abandoned Cellar"...');

    // First try to find existing to update
    const searchParams = new URLSearchParams({ seed: 'eq.abandoned-cellar' });
    const existingRes = await fetch(`${supabaseUrl}/rest/v1/dungeons?${searchParams}`, {
        headers
    });

    let method = 'POST';
    let finalUrl = url;

    if (existingRes.ok) {
        const existing = await existingRes.json();
        if (existing.length > 0) {
            console.log('Found existing dungeon, updating...');
            method = 'PATCH'; // Update
            finalUrl = `${url}?seed=eq.abandoned-cellar`;
        }
    }

    const res = await fetch(finalUrl, {
        method: method,
        headers: {
            ...headers,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(dungeonData)
    });

    if (!res.ok) {
        console.error('Failed:', await res.text());
        return;
    }

    const data = await res.json();
    console.log('✅ Dungeon Created:', data[0]);
    console.log('COPY THIS UUID:', data[0].id);
}

seed();
