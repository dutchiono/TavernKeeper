
import { NextRequest, NextResponse } from 'next/server';
import { runQueue } from '@/lib/queue';
import { supabase } from '@/lib/supabase';
import { dungeonStateService } from '@/lib/services/dungeonStateService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dungeonId, party, seed, paymentHash, walletAddress } = body;

    if (!dungeonId || !party || !Array.isArray(party) || party.length === 0 || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: dungeonId, party (array), walletAddress' },
        { status: 400 }
      );
    }

    // 1. Check Hero Availability

    // contract address from env or default
    const HERO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HERO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

    const checkingHeroes = party.map((id: string) => ({ contractAddress: HERO_CONTRACT_ADDRESS, tokenId: id }));

    const availability = await dungeonStateService.checkHeroesAvailability(checkingHeroes);
    if (availability.locked) {
      return NextResponse.json(
        { error: 'One or more heroes are currently locked in another dungeon run', lockedHeroes: availability.lockedHeroes },
        { status: 409 }
      );
    }

    // 2. Check User Daily Limits and Payment
    const userStats = await dungeonStateService.getUserDailyStats(walletAddress);
    const FREE_RUNS_LIMIT = 2;

    if (userStats.dailyRuns >= FREE_RUNS_LIMIT && !userStats.needsReset) {
      // User has exhausted free runs, check for payment
      if (!paymentHash) {
        return NextResponse.json(
          { error: 'Free runs exhausted. Payment required.', requiresPayment: true },
          { status: 402 } // Payment Required
        );
      }
      // TODO: Verify paymentHash on-chain (skipped for this demo step, trusting the hash exists/is valid-ish)
    }


    // 3. Resolve Dungeon ID (Handle slug vs UUID)
    let finalDungeonId = dungeonId;

    // Check if it's a UUID or a Seed
    // First try to look up by seed (slug)
    const { data: dData } = await supabase
      .from('dungeons')
      .select('id')
      .eq('seed', dungeonId)
      .single();

    if (dData) {
      finalDungeonId = dData.id;
    }

    // 4. Create run record
    let run;
    const { data, error: dbError } = await supabase
      .from('runs')
      .insert({
        dungeon_id: finalDungeonId,
        party,
        seed: seed || `run-${Date.now()}`,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Supabase Insert Error:', dbError);
      throw new Error(`Database insert failed: ${dbError.message} (Dungeon: ${finalDungeonId})`);
    }
    run = data;

    // 5. Lock Heroes & Update User Stats
    await Promise.all([
      dungeonStateService.lockHeroes(run.id, checkingHeroes),
      dungeonStateService.incrementUserDailyRun(walletAddress)
    ]);

    // 5. Enqueue simulation job
    // Sending resolved UUID (finalDungeonId) to worker
    await runQueue.add('simulate-run', {
      runId: run.id,
      dungeonId: finalDungeonId,
      party,
      seed: run.seed as string,
      startTime: new Date(run.start_time as string).getTime(),
    });

    return NextResponse.json({ id: run.id, status: 'queued' });
  } catch (error) {
    console.error('Error creating run:', error);
    return NextResponse.json(
      { error: 'Failed to create run' },
      { status: 500 }
    );
  }
}
