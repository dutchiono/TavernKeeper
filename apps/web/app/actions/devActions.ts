
'use server'

// Use fetch to avoid missing dependencies in apps/web
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_API_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_API_KEY;

export async function unlockAllHeroes() {
    console.log('Admin Action: Unlocking all heroes (REST)');

    // Debug checks
    const vars = {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_PROJECT_URL: !!process.env.SUPABASE_PROJECT_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_KEY: !!process.env.SUPABASE_KEY,
        SUPABASE_API_KEY: !!process.env.SUPABASE_API_KEY
    };
    console.log('Env Vars Check:', vars);
    console.log('Selected URL:', supabaseUrl);
    console.log('Selected Key (length):', supabaseKey?.length);

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        return { success: false, message: 'Missing Server Credentials: Check Server Logs' };
    }

    try {
        const url = `${supabaseUrl}/rest/v1/hero_states?status=neq.idle`;

        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                status: 'idle',
                current_run_id: null,
                locked_until: null
            })
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Supabase Error ${res.status}: ${text}`);
        }

        const data = await res.json();
        return { success: true, message: `Unlocked ${data?.length || 0} heroes` };

    } catch (e: any) {
        console.error('Unlock failed', e);
        return { success: false, message: e.message || 'Failed' };
    }
}
