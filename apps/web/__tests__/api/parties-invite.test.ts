import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/parties/[id]/invite/route';
import { NextRequest } from 'next/server';
import * as partyServiceModule from '@/lib/services/partyService';

vi.mock('@/lib/services/partyService');

describe('POST /api/parties/[id]/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate invite code successfully', async () => {
    const mockCode = 'ABC123';

    (partyServiceModule.generateInviteCode as any) = vi.fn().mockResolvedValue(mockCode);

    const request = new NextRequest('http://localhost/api/parties/party-123/invite', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-123',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'party-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toBe(mockCode);
    expect(partyServiceModule.generateInviteCode).toHaveBeenCalledWith('party-123', 'user-123');
  });

  it('should return 400 if userId is missing', async () => {
    const request = new NextRequest('http://localhost/api/parties/party-123/invite', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'party-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('User ID is required');
  });

  it('should return 500 if invite generation fails', async () => {
    (partyServiceModule.generateInviteCode as any) = vi.fn().mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/parties/party-123/invite', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-123',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'party-123' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to generate invite');
  });

  it('should handle errors gracefully', async () => {
    (partyServiceModule.generateInviteCode as any) = vi.fn().mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/parties/party-123/invite', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-123',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'party-123' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Internal server error');
  });
});
