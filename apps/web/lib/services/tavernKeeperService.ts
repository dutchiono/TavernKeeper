import { createPublicClient, formatEther, http, parseEther } from 'viem';
import { CONTRACT_REGISTRY, getContractAddress } from '../contracts/registry';
import { monad } from '../chains';

export interface OfficeState {
    currentKing: string;
    currentPrice: string; // formatted string
    kingSince: number;
    officeRate: string; // formatted string (dps)
    officeRateUsd: string; // Mocked for now
    priceUsd: string; // Mocked for now
    totalEarned: string; // formatted string
    totalEarnedUsd: string; // Mocked for now
    // New fields for interpolation
    epochId: number;
    startTime: number;
    nextDps: string; // formatted string
    initPrice: string; // formatted string
}

export const tavernKeeperService = {
    _cache: {
        data: null as OfficeState | null,
        timestamp: 0,
        ttl: 10000 // 10 seconds cache (reduced for Dutch Auction)
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
            const results = await Promise.allSettled([
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'getSlot0',
                    args: [],
                }),
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'getPrice',
                    args: [],
                }),
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'getDps',
                    args: [],
                }),
            ]);

            // Default values
            let slot0: any = {
                miner: '0x0000000000000000000000000000000000000000',
                startTime: BigInt(Math.floor(Date.now() / 1000)),
                dps: 0n,
                epochId: 0,
                initPrice: 0n,
            };
            let currentPrice = 0n;
            let nextDps = 0n;

            if (results[0].status === 'fulfilled') {
                slot0 = results[0].value;
            }
            if (results[1].status === 'fulfilled') {
                currentPrice = results[1].value as bigint;
            }
            if (results[2].status === 'fulfilled') {
                nextDps = results[2].value as bigint;
            }

            const currentKing = slot0.miner;
            const kingSince = Number(slot0.startTime);
            const officeRate = slot0.dps;

            // Calculate total earned based on time passed
            const duration = BigInt(Math.floor(Date.now() / 1000)) - BigInt(kingSince);
            const earned = duration > 0n ? duration * officeRate : 0n;

            const newState = {
                currentKing,
                currentPrice: formatEther(currentPrice),
                kingSince: kingSince * 1000,
                officeRate: formatEther(officeRate),
                officeRateUsd: '$0.00', // TODO: Fetch price
                priceUsd: '$0.00', // TODO: Fetch price
                totalEarned: formatEther(earned),
                totalEarnedUsd: '$0.00',
                epochId: Number(slot0.epochId),
                startTime: kingSince,
                nextDps: formatEther(nextDps),
                initPrice: formatEther(slot0.initPrice),
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
                totalEarnedUsd: '$0.00',
                epochId: 0,
                startTime: Math.floor(Date.now() / 1000),
                nextDps: '0',
                initPrice: '0',
            };
        }
    },

    async takeOffice(client: any, value: string, accountAddress?: string, message: string = "We Glaze The World") {
        const contractConfig = CONTRACT_REGISTRY.TAVERNKEEPER;
        const contractAddress = getContractAddress(contractConfig);

        if (!contractAddress) throw new Error("TavernKeeper contract not found");

        let account = client.account;

        if (!account && accountAddress) {
            account = accountAddress as `0x${string}`;
        }

        if (!account && typeof client.getAddresses === 'function') {
            const addresses = await client.getAddresses();
            if (addresses && addresses.length > 0) {
                account = addresses[0];
            }
        }

        if (!account) {
            throw new Error("Account not found. Please ensure your wallet is connected and unlocked.");
        }

        // Fetch current state to get epochId and price
        const state = await this.getOfficeState();
        const epochId = BigInt(state.epochId);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes deadline

        // Add buffer to max price (5%)
        const price = parseEther(state.currentPrice);
        const maxPrice = (price * 105n) / 100n;

        const hash = await client.writeContract({
            address: contractAddress,
            abi: contractConfig.abi,
            functionName: 'takeOffice',
            value: parseEther(value), // User pays the current price (or slightly more if they want, but contract checks msg.value >= price)
            // Actually contract checks msg.value >= price.
            // And returns excess.
            // We should pass the value user agreed to pay.
            chain: monad,
            account: account,
            args: [epochId, deadline, maxPrice, message],
        });

        return hash;
    }
};
