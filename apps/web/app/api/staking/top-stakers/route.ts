import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { getUserByAddress } from '../../../../lib/services/neynarService';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

interface StakerRow {
    address: string;
    amount: string;
    weighted_stake: string;
    lock_expiry?: string;
    lock_multiplier?: string;
}

export async function GET() {
    try {
        // Fetch top 5 stakers by weighted stake
        const { data: stakers, error } = await supabase
            .from<StakerRow>('stakers')
            .select('address, amount, weighted_stake')
            .order('weighted_stake', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching stakers from Supabase:', error);
            return NextResponse.json({ stakers: [] }, { status: 200 }); // Return empty array on error
        }

        if (!stakers || stakers.length === 0) {
            return NextResponse.json({ stakers: [] });
        }

        // Fetch usernames for each staker
        const stakersWithUsernames = await Promise.all(
            stakers.map(async (staker) => {
                try {
                    const userData = await getUserByAddress(staker.address);
                    return {
                        address: staker.address,
                        amount: BigInt(staker.amount),
                        weightedStake: BigInt(staker.weighted_stake),
                        username: userData?.username,
                    };
                } catch (error) {
                    console.error(`Error fetching username for ${staker.address}:`, error);
                    return {
                        address: staker.address,
                        amount: BigInt(staker.amount),
                        weightedStake: BigInt(staker.weighted_stake),
                        username: undefined,
                    };
                }
            })
        );

        return NextResponse.json({ stakers: stakersWithUsernames });
    } catch (error) {
        console.error('Error in top-stakers API:', error);
        return NextResponse.json({ stakers: [] }, { status: 200 }); // Return empty array on error
    }
}

