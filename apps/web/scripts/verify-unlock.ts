
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from root .env ONLY
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: rootEnvPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys");
    process.exit(1);
}

async function verify() {
    console.log('--- DB STATE VERIFICATION ---');
    const url = `${supabaseUrl}/rest/v1/hero_states?select=*`;

    const res = await fetch(url, {
        headers: {
            'apikey': supabaseKey as string,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    if (!res.ok) {
        console.error('Fetch failed', await res.text());
        return;
    }

    const rows = await res.json();
    console.log(`Found ${rows.length} hero states.`);

    const now = new Date();

    rows.forEach((row: any) => {
        const lockedUntil = row.locked_until ? new Date(row.locked_until) : null;
        const isTimeLocked = lockedUntil && lockedUntil > now;

        console.log(`Hero #${row.token_id}:`);
        console.log(`   Status: ${row.status}`);
        console.log(`   LockedUntil: ${row.locked_until}`);
        console.log(`   Is Time Locked? ${isTimeLocked ? 'YES' : 'No'}`);

        if (row.status === 'idle' && isTimeLocked) {
            console.log(`   ⚠️ BUG DETECTED: Hero is 'idle' but has future locked_until!`);
        }
    });
}

verify();
