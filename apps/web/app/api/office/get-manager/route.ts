import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { getUserByAddress } from '../../../../lib/services/neynarService';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json(
                { error: 'Missing required parameter: address' },
                { status: 400 }
            );
        }

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return NextResponse.json({
                fid: undefined,
                username: undefined,
                displayName: undefined,
            });
        }

        const normalizedAddress = address.toLowerCase();

        // Try to get from database first
        const { data, error } = await supabase
            .from('office_managers')
            .select('farcaster_fid, username, display_name')
            .eq('wallet_address', normalizedAddress)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching office manager from database:', error);
            return NextResponse.json({
                fid: undefined,
                username: undefined,
                displayName: undefined,
            });
        }

        // If found in database, return it
        if (data && (data.farcaster_fid || data.username)) {
            return NextResponse.json({
                fid: data.farcaster_fid || undefined,
                username: data.username || undefined,
                displayName: data.display_name || undefined,
            });
        }

        // If not in database, try to fetch from Neynar API (but don't fail if it errors)
        try {
            const userData = await getUserByAddress(normalizedAddress);
            if (userData) {
                // Save to database for next time
                await supabase
                    .from('office_managers')
                    .upsert({
                        wallet_address: normalizedAddress,
                        farcaster_fid: userData.fid,
                        username: userData.username || null,
                        display_name: userData.displayName || null,
                        last_updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'wallet_address'
                    });

                return NextResponse.json({
                    fid: userData.fid,
                    username: userData.username || undefined,
                    displayName: userData.displayName || undefined,
                });
            }
        } catch (neynarError) {
            // Neynar API failed - that's okay, just return empty data
            console.warn('Neynar API error (non-critical):', neynarError);
        }

        // No data found
        return NextResponse.json({
            fid: undefined,
            username: undefined,
            displayName: undefined,
        });
    } catch (error) {
        console.error('Error in get-manager route:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

