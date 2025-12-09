
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from root .env ONLY
const rootEnvPath = path.resolve(process.cwd(), '../../.env');

dotenv.config({ path: rootEnvPath });

console.log('Loading envs from:', rootEnvPath);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_API_KEY;

console.log('Environment Debug:');
console.log('  SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('  SUPABASE_KEY:', supabaseKey ? '✅ Found' : '❌ Missing');
// Filter for keys containing SUPABASE but mask the values
const availableKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
console.log('  Available Env Keys:', availableKeys);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env or .env.local');
    console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
    process.exit(1);
}

// Helper to fetch from Supabase
async function supabaseFetch(table: string, method: string = 'GET', body?: any) {
    const url = `${supabaseUrl}/rest/v1/${table}${method === 'GET' ? '?select=count' : ''}`;
    const headers: Record<string, string> = {
        'apikey': supabaseKey as string,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
    };

    if (method === 'POST') {
        headers['Prefer'] = 'return=representation';
    }

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase Error ${res.status}: ${text}`);
    }

    return res.json();
}

async function verify() {
    console.log('🔍 Verifying Dungeon Database Schema (via REST)...');

    // 1. Check 'runs' table
    try {
        console.log('\nChecking table: runs');
        await supabaseFetch('runs');
        console.log('✅ "runs" table exists and is accessible.');
    } catch (e: any) {
        console.error('❌ Failed to access "runs" table:', e.message);
    }

    // 2. Check 'hero_states'
    try {
        console.log('\nChecking table: hero_states');
        await supabaseFetch('hero_states');
        console.log('✅ "hero_states" table exists.');
    } catch (e: any) {
        console.error('❌ Failed to access "hero_states" table:', e.message);
    }

    // 3. Check 'user_dungeon_stats'
    try {
        console.log('\nChecking table: user_dungeon_stats');
        await supabaseFetch('user_dungeon_stats');
        console.log('✅ "user_dungeon_stats" table exists.');
    } catch (e: any) {
        console.error('❌ Failed to access "user_dungeon_stats" table:', e.message);
    }

    // 4. Check 'dungeons' map content
    try {
        console.log('\nChecking table: dungeons');
        // Need to create a new fetch to get ROWS, not count
        const url = `${supabaseUrl}/rest/v1/dungeons?select=*&limit=1`;
        const res = await fetch(url, {
            headers: {
                'apikey': supabaseKey as string,
                'Authorization': `Bearer ${supabaseKey}`,
            }
        });
        if (!res.ok) throw new Error(await res.text());
        const rows = await res.json();

        if (rows.length > 0) {
            console.log(`✅ "dungeons" table exists. Found ${rows.length} rows.`);
            const d = rows[0];
            console.log('Dungeon ID:', d.id);
            console.log('Dungeon Map Field Type:', typeof d.map);
            if (typeof d.map === 'object') {
                console.log('Dungeon Map ID property:', (d.map as any)?.id);
            } else {
                console.log('Dungeon Map content:', d.map);
            }
        } else {
            console.warn("⚠️ 'dungeons' table is empty!");
        }
    } catch (e: any) {
        console.error('❌ Failed to access "dungeons" table:', e.message);
    }

}

verify().catch(console.error);
