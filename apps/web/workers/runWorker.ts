import { simulateRun } from '@innkeeper/engine';
import type { Entity } from '@innkeeper/lib';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { getHeroByTokenId } from '../lib/services/heroOwnership';
import { supabase } from '../lib/supabase';

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
      // Load dungeon
      const { data: dungeon, error: dungeonError } = await supabase
        .from('dungeons')
        .select('*')
        .eq('id', dungeonId)
        .single();

      if (dungeonError || !dungeon) {
        throw new Error(`Dungeon ${dungeonId} not found`);
      }

      // Load heroes from Adventurer NFTs (party is array of token IDs)
      const heroPromises = party.map(tokenId => getHeroByTokenId(tokenId));
      const heroData = await Promise.all(heroPromises);

      // Convert heroes to entities for engine
      const entities: Entity[] = heroData.map((hero) => ({
        id: hero.id,
        name: hero.name,
        stats: hero.stats,
        position: undefined,
        isPlayer: true,
        inventory: [],
      }));

      // Run simulation
      // Extract mapId from dungeon data (assuming it's stored in map field or as a separate field)
      const mapId = (dungeon.map as any)?.id || dungeon.id;

      // Load agent IDs for party members (would need to query agents table)
      // For now, use character IDs as agent IDs (simplified)
      const agentIds = party;

      const result = await simulateRun({
        dungeonSeed: dungeon.seed as string,
        runId,
        startTime,
        entities,
        maxTurns: 100,
        mapId: mapId,
        agentIds: agentIds,
      } as any);

      // Persist run logs in batch
      const runLogs = result.events.map((event: any) => ({
        run_id: runId,
        text: JSON.stringify(event),
        json: event,
        timestamp: new Date(event.timestamp).toISOString(),
      }));

      const worldEvents = result.events.map((event: any) => ({
        run_id: runId,
        type: event.type,
        payload: event,
        timestamp: new Date(event.timestamp).toISOString(),
      }));

      await Promise.all([
        supabase.from('run_logs').insert(runLogs),
        supabase.from('world_events').insert(worldEvents),
      ]);

      // Update run status
      await supabase
        .from('runs')
        .update({
          end_time: new Date().toISOString(),
          result: result.result,
        })
        .eq('id', runId);

      return {
        success: true,
        runId,
        eventsCount: result.events.length,
        result: result.result,
      };
    } catch (error) {
      console.error(`Error processing run ${runId}:`, error);

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
