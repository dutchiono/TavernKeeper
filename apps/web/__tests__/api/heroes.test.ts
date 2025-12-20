import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/heroes/route';
import { NextRequest } from 'next/server';
import * as supabaseModule from '@/lib/supabase';

vi.mock('@/lib/supabase');

describe('GET /api/heroes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch heroes for a user', async () => {
    const mockHeroes = [
      {
        id: 'hero-1',
        token_id: '123',
        owner_address: '0xuser123',
        name: 'Test Hero',
      },
      {
        id: 'hero-2',
        token_id: '456',
        owner_address: '0xuser123',
        name: 'Another Hero',
      },
    ];

    const mockFrom = vi.fn();
    (supabaseModule.supabase.from as any) = mockFrom;

    // First call: heroes query
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockHeroes, error: null }),
      }),
    });

    // Second call: hero_states query
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const request = new NextRequest('http://localhost/api/heroes?userId=0xuser123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Response includes merged state fields (status, lockedUntil, currentRunId)
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      id: 'hero-1',
      token_id: '123',
      owner_address: '0xuser123',
      name: 'Test Hero',
      status: 'idle',
      lockedUntil: null,
      currentRunId: null,
    });
    expect(data[1]).toMatchObject({
      id: 'hero-2',
      token_id: '456',
      owner_address: '0xuser123',
      name: 'Another Hero',
      status: 'idle',
      lockedUntil: null,
      currentRunId: null,
    });
  });

  it('should return 400 if userId is missing', async () => {
    const request = new NextRequest('http://localhost/api/heroes');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('User ID');
  });

  it('should handle database errors', async () => {
    (supabaseModule.supabase.from as any) = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }),
    });

    const request = new NextRequest('http://localhost/api/heroes?userId=0xuser123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch heroes');
  });

  it('should return empty array if no heroes found', async () => {
    const mockFrom = vi.fn();
    (supabaseModule.supabase.from as any) = mockFrom;

    // First call: heroes query (returns empty)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const request = new NextRequest('http://localhost/api/heroes?userId=0xuser123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should convert userId to lowercase for query', async () => {
    const mockHeroes: any[] = [];

    const mockFrom = vi.fn();
    (supabaseModule.supabase.from as any) = mockFrom;

    // First call: heroes query
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockHeroes, error: null }),
      }),
    });

    // Second call: hero_states query (not called if no heroes, but mock it anyway)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const request = new NextRequest('http://localhost/api/heroes?userId=0xUSER123');
    await GET(request);

    const eqCall = mockFrom.mock.results[0].value.select().eq;
    expect(eqCall).toHaveBeenCalledWith('owner_address', '0xuser123');
  });
});
