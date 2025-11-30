import { describe, it, expect, vi, beforeEach } from 'vitest';
import { keepTokenService } from '../../lib/services/keepToken';
import { createPublicClient } from 'viem';

// Mock viem
vi.mock('viem', async () => {
    const actual = await vi.importActual('viem');
    return {
        ...actual,
        createPublicClient: vi.fn(),
        http: vi.fn(),
    };
});

// Mock registry
vi.mock('../../lib/contracts/registry', () => ({
    CONTRACT_REGISTRY: {
        KEEP_TOKEN: {
            abi: [],
        }
    },
    getContractAddress: vi.fn().mockReturnValue('0x123'),
}));

describe('keepTokenService', () => {
    const mockReadContract = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (createPublicClient as any).mockReturnValue({
            readContract: mockReadContract,
        });
    });

    describe('getBalance', () => {
        it('should return balance as string', async () => {
            mockReadContract.mockResolvedValue(1000000000000000000n); // 1 ETH
            const balance = await keepTokenService.getBalance('0xuser');
            expect(balance).toBe('1000000000000000000');
        });

        it('should return 0 on error', async () => {
            mockReadContract.mockRejectedValue(new Error('RPC Error'));
            const balance = await keepTokenService.getBalance('0xuser');
            expect(balance).toBe('0');
        });
    });

    describe('formatBalance', () => {
        it('should format wei to ether with 2 decimals', () => {
            const balance = '1500000000000000000'; // 1.5 ETH
            expect(keepTokenService.formatBalance(balance)).toBe('1.50');
        });

        it('should handle BigInt input', () => {
            const balance = 1500000000000000000n;
            expect(keepTokenService.formatBalance(balance)).toBe('1.50');
        });
    });
});
