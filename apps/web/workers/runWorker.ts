import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { supabase } from '../lib/supabase'; // Uses service role key automatically in server context
import { executeDungeonRun } from '../lib/services/dungeonRunService';
import { dungeonStateService } from '../lib/services/dungeonStateService';
import { CONTRACT_ADDRESSES } from '../lib/contracts/addresses';

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// Use environment variable first, then try CONTRACT_ADDRESSES, then fallback to testnet address
// Ensure we always have a valid address - never undefined
let HERO_CONTRACT_ADDRESS: string;
try {
  // Try to get from env first
  const envAddress = process.env.NEXT_PUBLIC_HERO_CONTRACT_ADDRESS;
  
  // Try to get from CONTRACT_ADDRESSES (may not be loaded yet)
  let contractAddressesValue: string | undefined;
  try {
    contractAddressesValue = CONTRACT_ADDRESSES?.ADVENTURER;
  } catch (e) {
    // CONTRACT_ADDRESSES might not be loaded yet, ignore
  }
  
  // Use env, then CONTRACT_ADDRESSES, then testnet fallback
  HERO_CONTRACT_ADDRESS = envAddress || contractAddressesValue || '0x4Fff2Ce5144989246186462337F0eE2C086F913E';
  
  // Final safety check - if somehow still undefined or zero address, use testnet address
  if (!HERO_CONTRACT_ADDRESS || HERO_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000' || HERO_CONTRACT_ADDRESS === 'undefined') {
    console.warn('[Worker] HERO_CONTRACT_ADDRESS was invalid, using testnet fallback');
    HERO_CONTRACT_ADDRESS = '0x4Fff2Ce5144989246186462337F0eE2C086F913E';
  }
} catch (error) {
  console.error('[Worker] Error initializing HERO_CONTRACT_ADDRESS:', error);
  HERO_CONTRACT_ADDRESS = '0x4Fff2Ce5144989246186462337F0eE2C086F913E'; // Fallback to testnet
}

// Final absolute safety check - ensure it's never undefined
if (typeof HERO_CONTRACT_ADDRESS === 'undefined' || !HERO_CONTRACT_ADDRESS) {
  HERO_CONTRACT_ADDRESS = '0x4Fff2Ce5144989246186462337F0eE2C086F913E';
  console.error('[Worker] CRITICAL: HERO_CONTRACT_ADDRESS was still undefined after initialization! Using hardcoded fallback.');
}

console.log(`[Worker] Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);
console.log(`[Worker] Hero Contract Address: ${HERO_CONTRACT_ADDRESS}`);
console.log(`[Worker] CONTRACT_ADDRESSES?.ADVENTURER: ${CONTRACT_ADDRESSES?.ADVENTURER}`);
console.log(`[Worker] NEXT_PUBLIC_HERO_CONTRACT_ADDRESS: ${process.env.NEXT_PUBLIC_HERO_CONTRACT_ADDRESS}`);

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`[Worker] Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err) => {
    console.error('[Worker] Redis connection error:', err.message);
    return true;
  },
});

// Test Redis connection
connection.on('connect', () => {
  console.log('[Worker] Redis connected successfully');
});

connection.on('ready', () => {
  console.log('[Worker] Redis ready');
});

connection.on('error', (err) => {
  console.error('[Worker] Redis error:', err);
});

connection.ping().then(() => {
  console.log('[Worker] Redis ping successful');
}).catch((err) => {
  console.error('[Worker] Redis ping failed:', err);
  console.error('[Worker] Make sure Redis is running and REDIS_URL is correct');
});

interface RunJobData {
  runId: string;
  dungeonId: string;
  party: string[];
  seed: string;
  startTime: number;
}

console.log('[Worker] Creating runWorker instance...');
console.log('[Worker] Queue name: run-simulation');
console.log('[Worker] Redis URL:', redisUrl.replace(/:[^:@]+@/, ':****@'));

export const runWorker = new Worker<RunJobData>(
  'run-simulation',
  async (job: Job<RunJobData>) => {
    console.log(`[Worker] ===== JOB RECEIVED ===== Job ${job.id} for run ${job.data.runId}`);
    const { runId, dungeonId, party, seed, startTime } = job.data;
    const jobStartTime = Date.now();

    console.log(`[Worker] Processing job ${job.id} for run ${runId}`);
    console.log(`[Worker] Job data:`, { runId, dungeonId, party: party.length, seed });
    console.log(`[Worker] Job start time: ${new Date(startTime).toISOString()}`);

    try {
      // Get wallet address from run or party
      // For now, we'll need to get it from the run record or pass it in job data
      console.log(`[Worker] Fetching run data from database...`);
      const fetchStartTime = Date.now();
      const { data: runData } = await supabase
        .from('runs')
        .select('*')
        .eq('id', runId)
        .single();
      console.log(`[Worker] Run data fetched in ${Date.now() - fetchStartTime}ms`);

      // Get wallet address from run record (now stored when run is created)
      // Fall back to getting from first hero if not in run record (for backwards compatibility)
      let walletAddress = runData?.wallet_address || '';

      if (!walletAddress) {
        // Fallback: try to get from hero ownership table
        console.log(`[Worker] Wallet address not in run record, attempting to get from hero ownership...`);
        try {
          const { data: ownership } = await supabase
            .from('hero_ownership')
            .select('owner_address')
            .eq('token_id', party[0])
            .single();
          if (ownership?.owner_address) {
            walletAddress = ownership.owner_address;
          }
        } catch (e) {
          console.warn(`[Worker] Could not get wallet address from hero ownership:`, e instanceof Error ? e.message : String(e));
        }
      }

      if (!walletAddress) {
        throw new Error(`Cannot determine wallet address for run ${runId}. Wallet address must be stored in run record or hero_ownership table.`);
      }

      console.log(`[Worker] Wallet address: ${walletAddress}`);
      console.log(`[Worker] HERO_CONTRACT_ADDRESS before executeDungeonRun: ${HERO_CONTRACT_ADDRESS}`);
      console.log(`[Worker] HERO_CONTRACT_ADDRESS type: ${typeof HERO_CONTRACT_ADDRESS}`);
      console.log(`[Worker] HERO_CONTRACT_ADDRESS is undefined: ${typeof HERO_CONTRACT_ADDRESS === 'undefined'}`);

      // Execute dungeon run using new service with timeout (5 minutes)
      console.log(`[Worker] Starting dungeon run execution (5 minute timeout)...`);
      const executionStartTime = Date.now();
      const DUNGEON_RUN_TIMEOUT = 5 * 60 * 1000; // 5 minutes
      
      let result;
      try {
        console.log(`[Worker] About to call executeDungeonRun...`);
        result = await withTimeout(
          executeDungeonRun(
            runId,
            dungeonId,
            party,
            seed,
            walletAddress
          ),
          DUNGEON_RUN_TIMEOUT,
          'executeDungeonRun'
        );
        console.log(`[Worker] executeDungeonRun completed successfully`);
      } catch (executeError) {
        console.error(`[Worker] Error in executeDungeonRun call:`, executeError);
        if (executeError instanceof Error) {
          console.error(`[Worker] executeDungeonRun error name: ${executeError.name}`);
          console.error(`[Worker] executeDungeonRun error message: ${executeError.message}`);
          console.error(`[Worker] executeDungeonRun error stack: ${executeError.stack}`);
        }
        throw executeError; // Re-throw to be caught by outer catch
      }
      const executionDuration = Date.now() - executionStartTime;
      console.log(`[Worker] Dungeon run completed in ${executionDuration}ms. Events generated: ${result.events.length}, Status: ${result.status}, Levels: ${result.levelsCompleted}, XP: ${result.totalXP}`);

      // Persist run logs in batch
      // NOTE: Events are already inserted into world_events by scheduleEventsSequentially
      // in executeDungeonRun, so we only need to insert run_logs here
      const runLogs = result.events.map((event) => ({
        run_id: runId,
        text: JSON.stringify(event),
        json: event,
        timestamp: new Date(event.timestamp).toISOString(),
      }));

      console.log(`[Worker] Inserting ${runLogs.length} run logs...`);
      console.log(`[Worker] Note: Events are scheduled via scheduleEventsSequentially in executeDungeonRun`);
      const insertStartTime = Date.now();
      const logsResult = await supabase.from('run_logs').insert(runLogs);
      const insertDuration = Date.now() - insertStartTime;
      console.log(`[Worker] Database insert completed in ${insertDuration}ms`);

      if (logsResult.error) {
        console.error(`[Worker] Error inserting run logs:`, logsResult.error);
      } else {
        console.log(`[Worker] Successfully inserted ${runLogs.length} run logs`);
      }

      // Update run status FIRST (before unlocking heroes)
      console.log(`[Worker] Updating run status in database...`);
      const updateStartTime = Date.now();
      const updateResult = await supabase
        .from('runs')
        .update({
          end_time: new Date().toISOString(),
          result: result.status,
        })
        .eq('id', runId);
      console.log(`[Worker] Run status updated in ${Date.now() - updateStartTime}ms`);
      
      if (updateResult.error) {
        console.error(`[Worker] Error updating run status:`, updateResult.error);
        console.error(`[Worker] Will still unlock heroes despite status update error`);
      } else {
        console.log(`[Worker] Run ${runId} marked as ${result.status}`);
      }

      // ALWAYS unlock heroes after run completes (success or failure)
      // The run has finished executing, so heroes should be unlocked regardless of status update success
      console.log(`[Worker] Unlocking heroes for completed run ${runId}...`);
      const unlockStartTime = Date.now();
      const checkingHeroes = party.map((id: string) => ({
        contractAddress: HERO_CONTRACT_ADDRESS,
        tokenId: id
      }));
      
      try {
        await dungeonStateService.unlockHeroes(checkingHeroes);
        console.log(`[Worker] Heroes unlocked in ${Date.now() - unlockStartTime}ms`);
        
        // Verify heroes were actually unlocked
        const { data: verifyHeroes } = await supabase
          .from('hero_states')
          .select('token_id, status, locked_until')
          .in('token_id', party);
        
        if (verifyHeroes) {
          const stillLocked = verifyHeroes.filter(h => h.status === 'dungeon' && h.locked_until && new Date(h.locked_until) > new Date());
          if (stillLocked.length > 0) {
            console.warn(`[Worker] Warning: ${stillLocked.length} heroes still appear locked after unlock attempt:`, stillLocked.map(h => h.token_id));
          } else {
            console.log(`[Worker] Verified: All ${party.length} heroes successfully unlocked`);
          }
        }
      } catch (unlockError) {
        console.error(`[Worker] Error unlocking heroes:`, unlockError);
        // Don't throw - we've already completed the run, just log the error
      }

      const totalDuration = Date.now() - jobStartTime;
      console.log(`[Worker] Job ${job.id} completed successfully in ${totalDuration}ms`);

      return {
        success: true,
        runId,
        eventsCount: result.events.length,
        result: result.status,
        levelsCompleted: result.levelsCompleted,
        totalXP: result.totalXP,
      };
    } catch (error) {
      const errorDuration = Date.now() - jobStartTime;
      console.error(`[Worker] Error processing run ${runId} after ${errorDuration}ms:`, error);
      if (error instanceof Error) {
        console.error(`[Worker] Error name: ${error.name}`);
        console.error(`[Worker] Error message: ${error.message}`);
        console.error(`[Worker] Error stack: ${error.stack}`);
        // If it's a ReferenceError, log additional details
        if (error.name === 'ReferenceError') {
          console.error(`[Worker] ReferenceError detected! This usually means a variable is not defined in scope.`);
          console.error(`[Worker] Error message suggests: ${error.message}`);
        }
      } else {
        console.error(`[Worker] Non-Error object thrown:`, typeof error, error);
      }

      // Unlock heroes on error
      try {
        // Use the module-level HERO_CONTRACT_ADDRESS (already initialized with proper fallbacks)
        const checkingHeroes = party.map((id: string) => ({
          contractAddress: HERO_CONTRACT_ADDRESS,
          tokenId: id
        }));
        await dungeonStateService.unlockHeroes(checkingHeroes);
      } catch (unlockError) {
        console.error('[Worker] Error unlocking heroes:', unlockError);
      }

      // Log error to database for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error(`[Worker] Full error details:`, {
        message: errorMessage,
        stack: errorStack,
        runId,
        dungeonId,
        party,
      });

      await supabase.from('run_logs').insert({
        run_id: runId,
        text: `Simulation Failed: ${errorMessage}\nStack: ${errorStack}`,
        type: 'system',
        timestamp: new Date().toISOString()
      });

      // Insert at least one error event so the UI can show something
      try {
        const errorEventResult = await supabase.from('world_events').insert({
          run_id: runId,
          type: 'error',
          payload: {
            type: 'error',
            level: 0,
            roomType: 'unknown',
            description: `Run failed: ${errorMessage}`,
            timestamp: Date.now(),
          },
          timestamp: new Date().toISOString(),
        });
        if (errorEventResult.error) {
          console.error(`[Worker] Error inserting error event:`, errorEventResult.error);
        } else {
          console.log(`[Worker] Successfully inserted error event for failed run ${runId}`);
        }
      } catch (eventError) {
        console.error(`[Worker] Exception inserting error event:`, eventError);
      }

      // Check if error is a timeout
      const isTimeout = error instanceof Error && error.message.includes('timed out');

      // Update run with error or timeout status
      await supabase
        .from('runs')
        .update({
          end_time: new Date().toISOString(),
          result: isTimeout ? 'timeout' : 'error',
        })
        .eq('id', runId);

      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 runs concurrently
    lockDuration: 10 * 60 * 1000, // 10 minutes - how long a job can be locked before being considered stalled
    maxStalledCount: 1, // Retry once if job stalls
  }
);

runWorker.on('active', (job) => {
  console.log(`[Worker] ⚡ Job ${job.id} is now active (processing started)`);
});

runWorker.on('waiting', (jobId) => {
  console.log(`[Worker] ⏳ Job ${jobId} is waiting to be processed`);
});

runWorker.on('stalled', (jobId) => {
  console.log(`[Worker] ⚠️ Job ${jobId} has stalled`);
});

runWorker.on('error', (error) => {
  console.error(`[Worker] ❌ Worker error:`, error);
  if (error instanceof Error) {
    console.error(`[Worker] Error message: ${error.message}`);
    console.error(`[Worker] Error stack:`, error.stack);
  }
  // Don't let worker errors crash the process - BullMQ will handle recovery
});

// Monitor worker health every 30 seconds
setInterval(() => {
  const isRunning = runWorker.isRunning();
  if (!isRunning) {
    console.error(`[Worker] ⚠️ CRITICAL: Worker is not running! This means jobs won't be processed.`);
  } else {
    console.log(`[Worker] ✅ Worker health check: Running (${new Date().toISOString()})`);
  }
}, 30000); // Check every 30 seconds

runWorker.on('completed', (job) => {
  console.log(`[Worker] Run simulation completed: ${job.id}`);
});

runWorker.on('failed', async (job, err) => {
  console.error(`[Worker] Run simulation failed: ${job?.id}`, err);
  if (err instanceof Error) {
    console.error(`[Worker] Error message: ${err.message}`);
    console.error(`[Worker] Error stack:`, err.stack);
  }

  // Update run status when job fails
  if (job?.data?.runId) {
    try {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Log error to database
      await supabase.from('run_logs').insert({
        run_id: job.data.runId,
        text: `Job Failed: ${errorMessage}\nStack: ${err instanceof Error ? err.stack : ''}`,
        type: 'system',
        timestamp: new Date().toISOString()
      });

      // Update run with error status
      await supabase
        .from('runs')
        .update({
          end_time: new Date().toISOString(),
          result: 'error',
          status: 'failed',
        })
        .eq('id', job.data.runId);

      console.log(`[Worker] Updated run ${job.data.runId} status to 'error'`);
    } catch (updateError) {
      console.error(`[Worker] Failed to update run status:`, updateError);
    }
  }
});

// Additional worker event handlers for diagnostics
runWorker.on('ready', () => {
  console.log(`[Worker] ✅ Worker is ready and listening for jobs on queue 'run-simulation'`);
  console.log(`[Worker] Worker state: isRunning=${runWorker.isRunning()}, isPaused=${runWorker.isPaused()}`);
});

runWorker.on('closing', () => {
  console.log(`[Worker] ⚠️ Worker is closing`);
});

runWorker.on('paused', () => {
  console.log(`[Worker] ⏸️ Worker is paused - THIS IS A PROBLEM! Jobs won't be processed.`);
  console.log(`[Worker] Attempting to resume worker...`);
  runWorker.resume();
});

runWorker.on('resumed', () => {
  console.log(`[Worker] ▶️ Worker resumed`);
});

// Verify worker is actually listening after a delay
setTimeout(() => {
  console.log(`[Worker] 🔍 Worker diagnostic check (5s after startup):`);
  console.log(`[Worker]   - isRunning: ${runWorker.isRunning()}`);
  console.log(`[Worker]   - isPaused: ${runWorker.isPaused()}`);
  console.log(`[Worker]   - name: ${runWorker.name}`);
  console.log(`[Worker]   - Redis connection: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);

  if (runWorker.isPaused()) {
    console.log(`[Worker] ⚠️ Worker is paused! Resuming...`);
    runWorker.resume();
  }
}, 5000); // Check 5 seconds after startup
