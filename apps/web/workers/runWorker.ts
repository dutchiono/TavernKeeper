import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { supabase } from '../lib/supabase';
import { executeDungeonRun } from '../lib/services/dungeonRunService';
import { dungeonStateService } from '../lib/services/dungeonStateService';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

interface RunJobData {
  runId: string;
  dungeonId: string;
  party: string[];
  seed: string;
  startTime: number;
}

export const runWorker = new Worker<RunJobData>(
  'run-simulation',
  async (job: Job<RunJobData>) => {
    const { runId, dungeonId, party, seed, startTime } = job.data;

    try {
      // Get wallet address from run or party
      // For now, we'll need to get it from the run record or pass it in job data
      const { data: runData } = await supabase
        .from('runs')
        .select('*')
        .eq('id', runId)
        .single();

      // Extract wallet from party - in production, this should be stored in run record
      // For now, we'll need to get it from hero ownership
      const HERO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HERO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
      const { getAdventurer } = await import('../contributions/adventurer-tracking/code/services/adventurerService');
      const firstHero = await getAdventurer({
        tokenId: party[0],
        contractAddress: HERO_CONTRACT_ADDRESS,
        chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '143', 10),
      });

      if (!firstHero) {
        throw new Error(`Could not find adventurer for hero ${party[0]}`);
      }

      const walletAddress = firstHero.walletAddress;

      // Execute dungeon run using new service
      const result = await executeDungeonRun(
        runId,
        dungeonId,
        party,
        seed,
        walletAddress
      );

      // Persist run logs in batch
      const runLogs = result.events.map((event) => ({
        run_id: runId,
        text: JSON.stringify(event),
        json: event,
        timestamp: new Date(event.timestamp).toISOString(),
      }));

      const worldEvents = result.events.map((event) => ({
        run_id: runId,
        type: event.type,
        payload: event,
        timestamp: new Date(event.timestamp).toISOString(),
      }));

      await Promise.all([
        supabase.from('run_logs').insert(runLogs),
        supabase.from('world_events').insert(worldEvents),
      ]);

      // Unlock heroes
      const checkingHeroes = party.map((id: string) => ({ 
        contractAddress: HERO_CONTRACT_ADDRESS, 
        tokenId: id 
      }));
      await dungeonStateService.unlockHeroes(checkingHeroes);

      // Update run status
      await supabase
        .from('runs')
        .update({
          end_time: new Date().toISOString(),
          result: result.status,
        })
        .eq('id', runId);

      return {
        success: true,
        runId,
        eventsCount: result.events.length,
        result: result.status,
        levelsCompleted: result.levelsCompleted,
        totalXP: result.totalXP,
      };
    } catch (error) {
      console.error(`Error processing run ${runId}:`, error);

      // Unlock heroes on error
      try {
        const HERO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HERO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
        const checkingHeroes = party.map((id: string) => ({ 
          contractAddress: HERO_CONTRACT_ADDRESS, 
          tokenId: id 
        }));
        await dungeonStateService.unlockHeroes(checkingHeroes);
      } catch (unlockError) {
        console.error('Error unlocking heroes:', unlockError);
      }

      // Log error to database for debugging
      await supabase.from('run_logs').insert({
        run_id: runId,
        text: `Simulation Failed: ${error instanceof Error ? error.message : String(error)}\nStack: ${error instanceof Error ? error.stack : ''}`,
        type: 'system',
        timestamp: new Date().toISOString()
      });

      // Update run with error status
      await supabase
        .from('runs')
        .update({
          end_time: new Date().toISOString(),
          result: 'error',
        })
        .eq('id', runId);

      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 runs concurrently
  }
);

runWorker.on('completed', (job) => {
  console.log(`Run simulation completed: ${job.id}`);
});

runWorker.on('failed', (job, err) => {
  console.error(`Run simulation failed: ${job?.id}`, err);
});
