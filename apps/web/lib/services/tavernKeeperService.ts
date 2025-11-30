import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { CONTRACT_REGISTRY, getContractAddress } from '../contracts/registry';
import { monad } from '../wagmi';

export interface OfficeState {
    currentKing: string;
    currentPrice: string; // formatted string
    kingSince: number;
    officeRate: string; // formatted string
    officeRateUsd: string; // Mocked for now
    priceUsd: string; // Mocked for now
    totalEarned: string; // formatted string
    totalEarnedUsd: string; // Mocked for now
}

export const tavernKeeperService = {
    _cache: {
        data: null as OfficeState | null,
        timestamp: 0,
        ttl: 60000 // 60 seconds cache (increased to reduce RPC load)
    },

    async getOfficeState(): Promise<OfficeState> {
        // Return cached data if valid
        const now = Date.now();
        if (this._cache.data && (now - this._cache.timestamp < this._cache.ttl)) {
            return this._cache.data;
        }

        try {
            const contractConfig = CONTRACT_REGISTRY.TAVERNKEEPER;
            const contractAddress = getContractAddress(contractConfig);

            if (!contractAddress) throw new Error("TavernKeeper contract not found");

            const publicClient = createPublicClient({
                chain: monad,
                transport: http(),
            });

            // Multicall would be better, but doing individual reads for now
            // Using Promise.allSettled to handle potential reverts (e.g. if contract is paused or not initialized)
            const results = await Promise.allSettled([
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'currentKing',
                    args: [],
                }),
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'currentPrice',
                    args: [],
                }),
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'kingSince',
                    args: [],
                }),
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'officeRate',
                    args: [],
                }),
            ]);

            const currentKing = results[0].status === 'fulfilled' ? results[0].value as string : '0x0000...0000';
            const currentPrice = results[1].status === 'fulfilled' ? results[1].value as bigint : 0n;
            const kingSince = results[2].status === 'fulfilled' ? results[2].value as bigint : BigInt(Math.floor(Date.now() / 1000));
            const officeRate = results[3].status === 'fulfilled' ? results[3].value as bigint : 0n;

            // Calculate total earned (mock or calculate based on time)
            const duration = BigInt(Math.floor(Date.now() / 1000)) - kingSince;
            const earned = duration > 0n ? duration * officeRate : 0n;

            const newState = {
                currentKing,
                currentPrice: formatEther(currentPrice),
                kingSince: Number(kingSince) * 1000,
                officeRate: formatEther(officeRate),
                officeRateUsd: '$0.00', // TODO: Fetch price
                priceUsd: '$0.00', // TODO: Fetch price
                totalEarned: formatEther(earned),
                totalEarnedUsd: '$0.00'
            };

            // Update Cache
            this._cache.data = newState;
            this._cache.timestamp = now;

            return newState;
        } catch (error) {
            console.error("Error fetching office state:", error);
            // Return cached data if available even if expired, otherwise default
            if (this._cache.data) return this._cache.data;

            return {
                currentKing: '0x0000...0000',
                currentPrice: '0',
                kingSince: Date.now(),
                officeRate: '0',
                officeRateUsd: '$0.00',
                priceUsd: '$0.00',
                totalEarned: '0',
                totalEarnedUsd: '$0.00'
            };
        }
    },

    async takeOffice(walletClient: any, value: string) {
        const contractConfig = CONTRACT_REGISTRY.TAVERNKEEPER;
        const contractAddress = getContractAddress(contractConfig);

        if (!contractAddress) throw new Error("TavernKeeper contract not found");

        const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractConfig.abi,
            functionName: 'takeOffice',
            value: parseEther(value),
            chain: monad,
            account: walletClient.account,
            args: [],
        });

        return hash;
    }
};
