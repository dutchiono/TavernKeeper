import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runService } from '@/lib/services/runService';

// Mock fetch globally
global.fetch = vi.fn();

describe('runService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveRun', () => {
    it('should fetch and return active run for wallet', async () => {
      const mockActiveRun = {
        id: 'run-123',
        dungeon_id: 'dungeon-123',
        party: ['char-1'],
        seed: 'test-seed',
        start_time: new Date().toISOString(),
        end_time: null,
        status: 'running',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activeRun: mockActiveRun }),
      });

      const result = await runService.getActiveRun('0xwallet123');

      expect(result).toEqual(mockActiveRun);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/runs?wallet=0xwallet123'
      );
    });

    it('should return null if no active run exists', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activeRun: null }),
      });

      const result = await runService.getActiveRun('0xwallet123');

      expect(result).toBeNull();
    });

    it('should throw error if API request fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(runService.getActiveRun('0xwallet123')).rejects.toThrow(
        'Failed to fetch active run'
      );
    });

    it('should URL encode wallet address', async () => {
      const walletWithSpecialChars = '0x1234 5678';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activeRun: null }),
      });

      await runService.getActiveRun(walletWithSpecialChars);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(walletWithSpecialChars))
      );
    });
  });

  describe('createRun', () => {
    it('should create a run and return run data', async () => {
      const mockRun = {
        id: 'run-123',
        status: 'queued',
        jobId: 'job-123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRun,
      });

      const result = await runService.createRun({
        dungeonId: 'dungeon-123',
        party: ['char-1'],
        walletAddress: '0xwallet123',
      });

      expect(result).toMatchObject({
        id: 'run-123',
        status: 'queued',
      });
      expect(global.fetch).toHaveBeenCalledWith('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dungeonId: 'dungeon-123',
          party: ['char-1'],
          walletAddress: '0xwallet123',
        }),
      });
    });

    it('should throw error if creation fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create run' }),
      });

      await expect(
        runService.createRun({
          party: ['char-1'],
          walletAddress: '0xwallet123',
        })
      ).rejects.toThrow('Failed to create run');
    });
  });

  describe('getRunStatus', () => {
    it('should fetch and return run status', async () => {
      const mockStatus = {
        id: 'run-123',
        status: 'running',
        start_time: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await runService.getRunStatus('run-123');

      expect(result).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith('/api/runs/run-123');
    });

    it('should throw error if run not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(runService.getRunStatus('invalid-id')).rejects.toThrow(
        'Failed to fetch run status'
      );
    });
  });
});

