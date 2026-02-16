import { NextResponse } from 'next/server';
import { FEATURE_FLAGS } from '../../../../lib/feature-flags';

// DISABLED: Token economy - user decided to focus on core game
// This endpoint is preserved for future re-enablement
export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  // Feature flag check - staking disabled
  if (!FEATURE_FLAGS.staking) {
    return NextResponse.json(
      { 
        error: 'Staking feature is currently disabled',
        message: 'Token economy features have been disabled to focus on core dungeon gameplay',
        stakers: [] 
      },
      { status: 200 }
    );
  }

  // Original implementation preserved below for future re-enablement
  // Uncomment when staking is re-enabled in feature-flags.ts
  /*
  import { supabase } from '../../../../lib/supabase';
  import { getUserByAddress } from '../../../../lib/services/neynarService';

  interface StakerRow {
      address: string;
      amount: string;
      weighted_stake: string;
      lock_expiry?: string;
      lock_multiplier?: string;
  }

  try {
      const { data: stakers, error } = await supabase
          .from<StakerRow>('stakers')
          .select('address, amount, weighted_stake, username')
          .order('weighted_stake', { ascending: false })
          .limit(5);

      if (error) {
          console.error('Error fetching stakers from Supabase:', JSON.stringify(error, null, 2));
          if (error.message?.includes('username') || error.message?.includes('column') || error.code === '42703') {
              console.log('Retrying without username column...');
              const { data: stakersRetry, error: retryError } = await supabase
                  .from<StakerRow>('stakers')
                  .select('address, amount, weighted_stake')
                  .order('weighted_stake', { ascending: false })
                  .limit(5);

              if (retryError) {
                  console.error('Error fetching stakers (retry):', JSON.stringify(retryError, null, 2));
                  return NextResponse.json({ stakers: [], error: retryError.message }, { status: 200 });
              }

              if (!stakersRetry || stakersRetry.length === 0) {
                  console.log('No stakers found in database');
                  return NextResponse.json({ stakers: [] });
              }

              const stakersWithUsernames = stakersRetry.map((staker) => ({
                  address: staker.address,
                  amount: staker.amount,
                  weightedStake: staker.weighted_stake,
                  username: undefined,
              }));

              return NextResponse.json({ stakers: stakersWithUsernames });
          }
          return NextResponse.json({ stakers: [], error: error.message }, { status: 200 });
      }

      if (!stakers || stakers.length === 0) {
          console.log('No stakers found in database');
          return NextResponse.json({ stakers: [] });
      }

      console.log(`Found ${stakers.length} stakers in database`);

      const stakersWithUsernames = stakers
          .filter((staker) => staker.address && staker.amount && staker.weighted_stake)
          .map((staker) => ({
              address: staker.address,
              amount: staker.amount,
              weightedStake: staker.weighted_stake,
              username: (staker as any).username || undefined,
          }));

      return NextResponse.json({ stakers: stakersWithUsernames });
  } catch (error) {
      console.error('Error in staking API:', error);
      return NextResponse.json(
          { error: 'Failed to fetch stakers', stakers: [] },
          { status: 200 }
      );
  }
  */
}