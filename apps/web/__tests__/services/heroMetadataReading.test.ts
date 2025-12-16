import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncUserHeroes, getHeroByTokenId } from '../../lib/services/heroOwnership';
import { initializeAdventurerStats } from '../../lib/services/heroAdventurerInit';
import * as heroOwnershipModule from '../../lib/services/heroOwnership';
import * as supabaseModule from '../../lib/supabase';
import * as metadataStorageModule from '../../lib/services/metadataStorage';
import { createPublicClient, http } from 'viem';
import { monad } from '../../lib/chains';

// Mock dependencies
vi.mock('../../../lib/supabase');
vi.mock('../../../lib/services/metadataStorage');
vi.mock('../../../lib/chains', () => ({
  monad: {
    id: 143,
    rpcUrls: {
      default: {
        http: ['https://test-rpc.monad.xyz']
      }
    }
  }
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(),
    http: vi.fn(),
    parseAbiItem: vi.fn((item: string) => item),
  };
});

describe('Hero Metadata Reading - Critical Issues', () => {
  let mockPublicClient: any;
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock public client
    mockPublicClient = {
      readContract: vi.fn(),
      getLogs: vi.fn(),
    };

    (createPublicClient as any).mockReturnValue(mockPublicClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncUserHeroes - Missing token_uri storage', () => {
    it('should store token_uri in heroes table when syncing', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const tokenId = '1';
      const tokenUri = 'data:application/json;base64,eyJuYW1lIjoiVGVzdCBIZXJvIiwiYXR0cmlidXRlcyI6W3sidHJhaXRfdHlwZSI6IkNsYXNzIiwidmFsdWUiOiJSb2d1ZSJ9XX0=';

      const mockMetadata = {
        name: 'Test Hero',
        attributes: [
          { trait_type: 'Class', value: 'Rogue' }
        ],
        hero: {
          class: 'Rogue'
        }
      };

      // Mock getLogs (Transfer events)
      mockPublicClient.getLogs.mockResolvedValue([
        {
          args: {
            tokenId: BigInt(tokenId),
            to: walletAddress,
            from: '0x0000000000000000000000000000000000000000'
          }
        }
      ]);

      // Mock ownerOf
      mockPublicClient.readContract.mockImplementation(({ functionName, args }: any) => {
        if (functionName === 'ownerOf') {
          return Promise.resolve(walletAddress);
        }
        if (functionName === 'tokenURI') {
          return Promise.resolve(tokenUri);
        }
        return Promise.resolve(null);
      });

      // Mock metadataStorage.getHttpUrl
      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(tokenUri);

      // Mock supabase
      const mockUpsert = vi.fn().mockResolvedValue({
        data: { token_id: tokenId },
        error: null
      });
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { token_id: tokenId },
              error: null
            })
          })
        })
      });

      await syncUserHeroes(walletAddress);

      // Verify that token_uri was stored in the heroes table
      const upsertCall = (supabaseModule.supabase.from as any).mock.calls.find(
        (call: any[]) => call[0] === 'heroes'
      );

      expect(upsertCall).toBeDefined();

      // The critical issue: token_uri is NOT being stored
      // This test should FAIL initially, then we fix it
      const heroesTableCall = (supabaseModule.supabase.from as any)();
      const upsertData = heroesTableCall.upsert.mock.calls[0]?.[0];

      // This assertion will fail - proving the bug
      expect(upsertData).toHaveProperty('token_uri');
      expect(upsertData.token_uri).toBe(tokenUri);
    });

    it('should handle metadata fetch failures gracefully without defaulting to Warrior', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const tokenId = '2';
      const tokenUri = 'https://example.com/metadata/2';

      mockPublicClient.getLogs.mockResolvedValue([
        {
          args: {
            tokenId: BigInt(tokenId),
            to: walletAddress,
            from: '0x0000000000000000000000000000000000000000'
          }
        }
      ]);

      mockPublicClient.readContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'ownerOf') {
          return Promise.resolve(walletAddress);
        }
        if (functionName === 'tokenURI') {
          return Promise.resolve(tokenUri);
        }
        return Promise.resolve(null);
      });

      // Simulate metadata fetch failure
      mockFetch.mockRejectedValue(new Error('Network error'));
      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(tokenUri);

      const mockUpsert = vi.fn().mockResolvedValue({
        data: { token_id: tokenId },
        error: null
      });
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { token_id: tokenId },
              error: null
            })
          })
        })
      });

      // Should not throw, but should store token_uri even if metadata fetch fails
      await expect(syncUserHeroes(walletAddress)).resolves.not.toThrow();

      // Verify token_uri is stored even when metadata fetch fails
      const heroesTableCall = (supabaseModule.supabase.from as any)();
      const upsertData = heroesTableCall.upsert.mock.calls[0]?.[0];
      expect(upsertData).toHaveProperty('token_uri');
      expect(upsertData.token_uri).toBe(tokenUri);
    });
  });

  describe('getHeroByTokenId - Default fallback issues', () => {
    it('should NOT default to Warrior when metadata is successfully fetched but class is missing', async () => {
      const tokenId = '3';
      const tokenUri = 'data:application/json;base64,eyJuYW1lIjoiTXkgSGVybyJ9'; // Only name, no class

      const mockMetadata = {
        name: 'My Hero'
        // Intentionally missing class
      };

      mockPublicClient.readContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'tokenURI') {
          return Promise.resolve(tokenUri);
        }
        return Promise.resolve(null);
      });

      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(tokenUri);

      // Mock successful metadata fetch
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata
      });

      const result = await getHeroByTokenId(tokenId);

      // The bug: it defaults to 'Warrior' even when metadata was successfully fetched
      // This should throw an error or return null, not default
      expect(result.metadata).toBeDefined();
      expect(result.metadata.name).toBe('My Hero');

      // This assertion will fail - proving the bug
      // If class is missing from metadata, we should NOT default to Warrior
      // We should either throw an error or return a clear indication that metadata is incomplete
      expect(result.metadata.hero?.class).not.toBe('Warrior');
    });

    it('should properly extract class from metadata.hero.class', async () => {
      const tokenId = '4';
      const tokenUri = 'data:application/json;base64,eyJuYW1lIjoiTWFnZSIsImhlcm8iOnsiY2xhc3MiOiJNYWdlIn19';

      const mockMetadata = {
        name: 'Mage',
        hero: {
          class: 'Mage'
        }
      };

      mockPublicClient.readContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'tokenURI') {
          return Promise.resolve(tokenUri);
        }
        return Promise.resolve(null);
      });

      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(tokenUri);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata
      });

      const result = await getHeroByTokenId(tokenId);

      // Should correctly extract Mage class, not default to Warrior
      expect(result.metadata.hero.class).toBe('Mage');
      expect(result.stats.int).toBe(16); // Mage has high INT
      expect(result.stats.str).toBe(8); // Mage has low STR
    });

    it('should properly extract class from metadata.attributes', async () => {
      const tokenId = '5';
      const tokenUri = 'data:application/json;base64,eyJuYW1lIjoiQ2xlcmljIiwiYXR0cmlidXRlcyI6W3sidHJhaXRfdHlwZSI6IkNsYXNzIiwidmFsdWUiOiJDbGVyaWMifV19';

      const mockMetadata = {
        name: 'Cleric',
        attributes: [
          { trait_type: 'Class', value: 'Cleric' }
        ]
      };

      mockPublicClient.readContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'tokenURI') {
          return Promise.resolve(tokenUri);
        }
        return Promise.resolve(null);
      });

      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(tokenUri);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata
      });

      const result = await getHeroByTokenId(tokenId);

      // Should correctly extract Cleric class from attributes
      expect(result.metadata.attributes[0].value).toBe('Cleric');
      expect(result.stats.wis).toBe(16); // Cleric has high WIS
    });

    it('should throw error when metadata fetch fails completely', async () => {
      const tokenId = '6';
      const tokenUri = 'https://example.com/metadata/6';

      mockPublicClient.readContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'tokenURI') {
          return Promise.resolve(tokenUri);
        }
        return Promise.resolve(null);
      });

      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(tokenUri);

      // Simulate complete metadata fetch failure
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Should throw or return error, not default to Warrior
      await expect(getHeroByTokenId(tokenId)).rejects.toThrow();
    });
  });

  describe('initializeAdventurerStats - Default fallback issues', () => {
    it('should NOT default to warrior when getHeroByTokenId returns valid metadata without class', async () => {
      const tokenId = '7';
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const contractAddress = '0xcontract';
      const chainId = 143;

      // Mock getHeroByTokenId to return metadata without class
      vi.spyOn(heroOwnershipModule, 'getHeroByTokenId').mockResolvedValue({
        id: tokenId,
        name: 'Test Hero',
        stats: {
          str: 10,
          dex: 10,
          con: 10,
          int: 10,
          wis: 10,
          cha: 10,
          ac: 10,
          hp: 10,
          maxHp: 10,
          attackBonus: 0
        },
        metadata: {
          name: 'Test Hero'
          // Missing class
        }
      });

      // Mock getAdventurer to return null (not initialized)
      (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // Not found
              })
            })
          })
        }),
        upsert: vi.fn().mockResolvedValue({
          data: {},
          error: null
        })
      });

      // Should throw error or return null, not default to warrior
      await expect(
        initializeAdventurerStats(tokenId, contractAddress, chainId, walletAddress)
      ).rejects.toThrow();
    });
  });

  describe('Metadata URI handling in different formats', () => {
    it('should handle data URI format correctly', async () => {
      const tokenId = '8';
      const dataUri = 'data:application/json;base64,eyJuYW1lIjoiRGF0YSBVUkkgSGVybyIsImhlcm8iOnsiY2xhc3MiOiJSb2d1ZSJ9fQ==';

      const mockMetadata = {
        name: 'Data URI Hero',
        hero: {
          class: 'Rogue'
        }
      };

      mockPublicClient.readContract.mockResolvedValue(dataUri);
      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(dataUri);

      // For data URIs, we should parse directly, not fetch
      const result = await getHeroByTokenId(tokenId);

      expect(result.metadata.name).toBe('Data URI Hero');
      expect(result.metadata.hero.class).toBe('Rogue');
    });

    it('should handle IPFS URI format correctly', async () => {
      const tokenId = '9';
      const ipfsUri = 'ipfs://QmTest123';
      const httpUrl = 'https://ipfs.io/ipfs/QmTest123';

      const mockMetadata = {
        name: 'IPFS Hero',
        hero: {
          class: 'Mage'
        }
      };

      mockPublicClient.readContract.mockResolvedValue(ipfsUri);
      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(httpUrl);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata
      });

      const result = await getHeroByTokenId(tokenId);

      expect(result.metadata.name).toBe('IPFS Hero');
      expect(result.metadata.hero.class).toBe('Mage');
    });

    it('should handle HTTP URI format correctly', async () => {
      const tokenId = '10';
      const httpUri = 'https://example.com/metadata/10';

      const mockMetadata = {
        name: 'HTTP Hero',
        hero: {
          class: 'Cleric'
        }
      };

      mockPublicClient.readContract.mockResolvedValue(httpUri);
      (metadataStorageModule.metadataStorage.getHttpUrl as any) = vi.fn().mockReturnValue(httpUri);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata
      });

      const result = await getHeroByTokenId(tokenId);

      expect(result.metadata.name).toBe('HTTP Hero');
      expect(result.metadata.hero.class).toBe('Cleric');
    });
  });
});

