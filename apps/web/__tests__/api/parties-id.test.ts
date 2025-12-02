import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/parties/[id]/route';
import { NextRequest } from 'next/server';
import * as partyServiceModule from '@/lib/services/partyService';

vi.mock('@/lib/services/partyService');

describe('GET /api/parties/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch party details with members', async () => {
    const mockParty = {
      id: 'party-123',
      owner_id: 'user-123',
      dungeon_id: 'dungeon-456',
    };

    const mockMembers = [
      { hero_token_id: '123', hero_contract: '0xcontract123' },
      { hero_token_id: '456', hero_contract: '0xcontract123' },
    ];

    (partyServiceModule.getParty as any) = vi.fn().mockResolvedValue(mockParty);
    (partyServiceModule.getPartyMembers as any) = vi.fn().mockResolvedValue(mockMembers);

    const request = new NextRequest('http://localhost/api/parties/party-123');
    const response = await GET(request, { params: Promise.resolve({ id: 'party-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ...mockParty, members: mockMembers });
    expect(partyServiceModule.getParty).toHaveBeenCalledWith('party-123');
    expect(partyServiceModule.getPartyMembers).toHaveBeenCalledWith('party-123');
  });

  it('should return 404 if party not found', async () => {
    (partyServiceModule.getParty as any) = vi.fn().mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/parties/party-123');
    const response = await GET(request, { params: Promise.resolve({ id: 'party-123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Party not found');
  });
});

describe('PATCH /api/parties/[id]', () => {
  it('should return 501 not implemented', async () => {
    const request = new NextRequest('http://localhost/api/parties/party-123', {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'party-123' }) });
    const data = await response.json();

    expect(response.status).toBe(501);
    expect(data.error).toContain('Not implemented');
  });
});

describe('DELETE /api/parties/[id]', () => {
  it('should return 501 not implemented', async () => {
    const request = new NextRequest('http://localhost/api/parties/party-123', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'party-123' }) });
    const data = await response.json();

    expect(response.status).toBe(501);
    expect(data.error).toContain('Not implemented');
  });
});
