
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env vars from root .env ONLY (Clone of verify-dungeon-db.ts logic)
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
    process.env.SUPABASE_API_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

// Use fetch wrapper to avoid supabase-js dependency if it fails
// Actually let's try fetch for safety since verify-dungeon-db used fetch
// and verify-dungeon-db worked.

async function supabaseFetch(endpoint: string, options: any = {}) {
    // Ensure URL doesn't double slash if endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${supabaseUrl}/rest/v1/${cleanEndpoint}`;

    const headers = {
        'apikey': supabaseKey as string,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation',
        ...options.headers
    };

    const res = await fetch(url, {
        ...options,
        headers
    });

    if (!res.ok) {
        const text = await res.text();
        // Ignore 406 for HEAD/Count
        if (options.method === 'HEAD' || (options.headers?.Prefer && options.headers.Prefer.includes('count=exact') && res.status === 406)) {
            return null;
        }
        throw new Error(`Supabase Error ${res.status}: ${text}`);
    }

    if (res.status === 204) return null;

    // If we asked for count, get it from header
    if (options.headers?.Prefer?.includes('count=exact')) {
        const range = res.headers.get('content-range');
        if (range) {
            return { count: range.split('/')[1] };
        }
    }

    try {
        return await res.json();
    } catch {
        return null;
    }
}


async function unlockHeroes() {
    console.log('Unlocking all heroes (resetting to idle)...');
    try {
        // 1. Reset Status
        await supabaseFetch('hero_states?status=neq.idle', {
            method: 'PATCH',
            body: JSON.stringify({ status: 'idle', current_run_id: null, locked_until: null })
        });
        // 2. Clear Time Locks for any remaining rows (Bug Fix)
        await supabaseFetch('hero_states?locked_until=not.is.null', {
            method: 'PATCH',
            body: JSON.stringify({ locked_until: null })
        });
        console.log(`Unlocked heroes successfully (Status & Time).`);
    } catch (e) {
        console.error('Failed to unlock heroes:', e);
    }
}

async function checkLatestRun() {
    console.log('Checking latest run...');
    const runs = await supabaseFetch('runs?order=start_time.desc&limit=1');

    if (!runs || runs.length === 0) {
        console.log('No runs found.');
        return;
    }

    const run = runs[0];
    console.log('Latest Run ID:', run.id);
    console.log('Latest Run Result:', run.result);
    console.log('Latest Run Start:', run.start_time);

    // Check events count
    const eventsRes = await fetch(`${supabaseUrl}/rest/v1/world_events?run_id=eq.${run.id}&select=*&limit=1`, {
        method: 'GET',
        headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'count=exact'
        }
    });

    if (eventsRes.ok) {
        const range = eventsRes.headers.get('content-range');
        const count = range ? range.split('/')[1] : 'unknown';
        console.log(`Event count for run ${run.id}: ${count}`);
    } else {
        console.log('Failed to check events count');
    }
    // Check Run Logs (for errors)
    const logsRes = await supabaseFetch(`run_logs?run_id=eq.${run.id}&select=*`);
    if (logsRes && logsRes.length > 0) {
        console.log('--- Run Logs ---');
        logsRes.forEach((l: any) => console.log(`[${l.type}] ${l.text}`));
    }
}

async function main() {
    try {
        // await unlockHeroes(); // Skip unlock
        await checkLatestRun();
    } catch (e) {
        console.error('Script failed:', e);
    }
}

main();
