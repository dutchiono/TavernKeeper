
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as metadataStorageModule from '../../lib/services/metadataStorage';

// Hoist the mock function so it can be used in the factory
const mocks = vi.hoisted(() => ({
    readContract: vi.fn(),
}));

vi.mock('viem', async () => {
    const actual = await vi.importActual('viem');
    return {
        ...actual,
        createPublicClient: vi.fn(() => ({
            readContract: mocks.readContract,
            getLogs: vi.fn(),
        })),
        http: vi.fn(),
        parseAbiItem: vi.fn((item: string) => item),
    };
});

// Import after mocks are set up
import { getHeroByTokenId } from '../../lib/services/heroOwnership';

// Mock dependencies
vi.mock('../../../lib/supabase', () => ({
    supabase: {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: null })
                    })
                })
            })
        })
    }
}));

vi.mock('../../../lib/services/metadataStorage');
vi.mock('../../../lib/chains', () => ({
    monad: {
        id: 143,
        rpcUrls: {
            default: { http: ['https://test-rpc.monad.xyz'] }
        }
    }
}));

describe('Hero Ownership - Client First Refactor', () => {
    let mockFetch: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock fetch globally
        mockFetch = vi.fn();
        global.fetch = mockFetch;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return metadataUri and defaults when metadata fetch fails', async () => {
        const tokenId = '999';
        const tokenUri = 'https://example.com/broken-metadata.json';

        // 1. Mock contract returning URI using the hoisted mock
        mocks.readContract.mockResolvedValue(tokenUri);

        // 2. Mock URL resolver
        (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(tokenUri);

        // 3. Mock fetch rejection (server-side failure)
        mockFetch.mockRejectedValue(new Error('Network Error!'));

        // Execute
        const result = await getHeroByTokenId(tokenId);

        // Verify
        expect(result).toBeDefined();
        expect(result.id).toBe(tokenId);
        expect(result.name).toContain(tokenId); // Should default to "Hero #999"
        expect(result.metadata).toEqual({}); // Empty or partial
        expect(result.metadataUri).toBe(tokenUri); // CRITICAL: Must return the URI

        // Stats should be defaulted (Warrior defaults)
        expect(result.stats).toBeDefined();
        expect(result.stats.str).toBe(16); // Warrior str
    });

    it('should return metadataUri even if metadata is missing class', async () => {
        const tokenId = '888';
        const tokenUri = 'https://example.com/partial-metadata.json';

        mocks.readContract.mockResolvedValue(tokenUri);
        (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(tokenUri);

        // Mock fetch success but empty/invalid metadata
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ name: 'Incomplete Hero' })
        });

        const result = await getHeroByTokenId(tokenId);

        expect(result.metadata.name).toBe('Incomplete Hero');
        expect(result.metadataUri).toBe(tokenUri);
    });
});
