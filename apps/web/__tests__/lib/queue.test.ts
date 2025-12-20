import { describe, it, expect, vi } from 'vitest';

// Mock ioredis BEFORE importing queue module
// This ensures the mock is in place when queue.ts imports Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      connect: vi.fn(),
      quit: vi.fn(),
      ping: vi.fn().mockResolvedValue('PONG'),
    })),
  };
});

// Import after mock is set up
import { runQueue, replayQueue } from '@/lib/queue';
import Redis from 'ioredis';

describe('Queue', () => {
  it('should create runQueue with correct name', () => {
    expect(runQueue.name).toBe('run-simulation');
  });

  it('should create replayQueue with correct name', () => {
    expect(replayQueue.name).toBe('replay-generation');
  });

  it('should use Redis connection with maxRetriesPerRequest null', () => {
    // Redis is called when queue.ts module loads (before tests run)
    // Don't clear mocks - we need to verify the call that happened during import
    // Check that Redis was called with the correct options
    expect(Redis).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        maxRetriesPerRequest: null,
      })
    );
  });
});

