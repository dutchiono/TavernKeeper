import { GET } from '@/app/api/heroes/[tokenId]/route';
import * as registryModule from '@/lib/contracts/registry';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all contract-related modules to prevent any real network calls
vi.mock('@/lib/contracts/registry');
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: vi.fn(),
    })),
    http: vi.fn(),
  };
});

// Mock fetch globally to prevent any HTTP calls
global.fetch = vi.fn();

describe('GET /api/heroes/[tokenId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ADVENTURER_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  });

  it('should fetch hero details successfully', async () => {
    const mockOwner = '0xowner123';
    const mockUri = 'https://example.com/metadata/123';
    const mockMetadata = {
      name: 'Test Hero',
      description: 'A test hero',
      image: 'https://example.com/image.png',
    };

    (registryModule.getContractAddress as any) = vi.fn().mockReturnValue('0x1234567890123456789012345678901234567890');
    (registryModule.CONTRACT_REGISTRY as any) = {
      ADVENTURER: {
        abi: [],
      },
    };

    const { createPublicClient } = await import('viem');
    const mockClient = {
      readContract: vi.fn()
        .mockResolvedValueOnce(mockOwner)
        .mockResolvedValueOnce(mockUri),
    };
    (createPublicClient as any).mockReturnValue(mockClient);

    (global.fetch as any) = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockMetadata),
    });

    const request = new Request('http://localhost/api/heroes/123');
    const response = await GET(request, { params: Promise.resolve({ tokenId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokenId).toBe('123');
    expect(data.owner).toBe(mockOwner);
    expect(data.uri).toBe(mockUri);
    expect(data.metadata).toEqual(mockMetadata);
  });

  it('should return 400 if tokenId is missing', async () => {
    const request = new Request('http://localhost/api/heroes/');
    const response = await GET(request, { params: Promise.resolve({ tokenId: '' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing token ID');
  });

  it('should return 500 if contract not configured', async () => {
    (registryModule.getContractAddress as any) = vi.fn().mockReturnValue(null);

    const request = new Request('http://localhost/api/heroes/123');
    const response = await GET(request, { params: Promise.resolve({ tokenId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Contract not configured');
  });

  it('should handle metadata fetch errors gracefully', async () => {
    const mockOwner = '0xowner123';
    const mockUri = 'https://example.com/metadata/123';

    (registryModule.getContractAddress as any) = vi.fn().mockReturnValue('0x1234567890123456789012345678901234567890');
    (registryModule.CONTRACT_REGISTRY as any) = {
      ADVENTURER: {
        abi: [],
      },
    };

    const { createPublicClient } = await import('viem');
    const mockClient = {
      readContract: vi.fn()
        .mockResolvedValueOnce(mockOwner)
        .mockResolvedValueOnce(mockUri),
    };
    (createPublicClient as any).mockReturnValue(mockClient);

    (global.fetch as any) = vi.fn().mockRejectedValue(new Error('Network error'));

    const request = new Request('http://localhost/api/heroes/123');
    const response = await GET(request, { params: Promise.resolve({ tokenId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata).toEqual({});
  });

  it('should handle non-HTTP URIs', async () => {
    const mockOwner = '0xowner123';
    const mockUri = 'ipfs://QmHash';

    (registryModule.getContractAddress as any) = vi.fn().mockReturnValue('0x1234567890123456789012345678901234567890');
    (registryModule.CONTRACT_REGISTRY as any) = {
      ADVENTURER: {
        abi: [],
      },
    };

    const { createPublicClient } = await import('viem');
    const mockClient = {
      readContract: vi.fn()
        .mockResolvedValueOnce(mockOwner)
        .mockResolvedValueOnce(mockUri),
    };
    (createPublicClient as any).mockReturnValue(mockClient);

    const request = new Request('http://localhost/api/heroes/123');
    const response = await GET(request, { params: Promise.resolve({ tokenId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata).toEqual({});
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
