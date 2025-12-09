
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

// Helper to fetch from Supabase
async function supabaseFetch(table: string, method: string = 'GET', body?: any) {
    const url = `${supabaseUrl}/rest/v1/${table}?select=*`;
    const headers: Record<string, string> = {
        'apikey': supabaseKey as string,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
    };

    const res = await fetch(url, { method, headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase Error ${res.status}: ${text}`);
    }
    return res.json();
}

async function check() {
    console.log('🔍 Checking "dungeons" table...');
    try {
        const dungeons = await supabaseFetch('dungeons');
        console.log('Found', dungeons.length, 'dungeons.');
        dungeons.forEach((d: any) => {
            console.log(`- ID: ${d.id} | Seed: ${d.seed}`);
        });
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

check();
