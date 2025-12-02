import { createPublicClient, formatEther, http, parseEther } from 'viem';
import { monad } from '../chains';
import { CONTRACT_REGISTRY, getContractAddress } from '../contracts/registry';

export interface CellarState {
    potSize: string; // ETH in the contract
    currentPrice: string; // LP tokens required to buy
    epochId: number;
    startTime: number;
    initPrice: string;
    paymentToken: string;
}

export const theCellarService = {
    _cache: {
        data: null as CellarState | null,
        timestamp: 0,
        ttl: 10000 // 10 seconds cache
    },

    clearCache() {
        this._cache.data = null;
        this._cache.timestamp = 0;
    },

    async getCellarState(): Promise<CellarState> {
        const now = Date.now();
        if (this._cache.data && (now - this._cache.timestamp < this._cache.ttl)) {
            return this._cache.data;
        }

        try {
            const contractConfig = CONTRACT_REGISTRY.THECELLAR;
            const contractAddress = getContractAddress(contractConfig);

            if (!contractAddress) throw new Error("TheCellar contract not found");

            const publicClient = createPublicClient({
                chain: monad,
                transport: http(),
            });

            const results = await Promise.allSettled([
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'potBalance',
                    args: [],
                }),
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'slot0',
                    args: [],
                }),
                publicClient.readContract({
                    address: contractAddress,
                    abi: contractConfig.abi,
                    functionName: 'getAuctionPrice',
                    args: [],
                }),
            ]);

            let potSize = 0n;
            let slot0: any = {
                epochId: 0,
                initPrice: 0n,
                startTime: 0,
            };
            let currentPrice = 0n;
            // Payment token is the CellarHook contract itself (CLP)
            let paymentToken = contractAddress;

            if (results[0].status === 'fulfilled') potSize = results[0].value as bigint;
            if (results[1].status === 'fulfilled') slot0 = results[1].value;
            if (results[2].status === 'fulfilled') currentPrice = results[2].value as bigint;

            const newState = {
                potSize: formatEther(potSize),
                currentPrice: formatEther(currentPrice),
                epochId: Number(slot0.epochId),
                startTime: Number(slot0.startTime) * 1000,
                initPrice: formatEther(slot0.initPrice),
                paymentToken,
            };

            this._cache.data = newState;
            this._cache.timestamp = now;

            return newState;
        } catch (error) {
            console.error("Error fetching cellar state:", error);
            if (this._cache.data) return this._cache.data;
            return {
                potSize: '0',
                currentPrice: '0',
                epochId: 0,
                startTime: Date.now(),
                initPrice: '0',
                paymentToken: '0x0000000000000000000000000000000000000000',
            };
        }
    },

    async getAllowance(owner: string, tokenAddress: string): Promise<bigint> {
        // CellarHook (CLP) is the token and the spender (burner).
        // Since raid() calls _burn(msg.sender), no approval is needed.
        // We return max uint256 to simulate infinite approval.
        return 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
    },

    async approve(client: any, tokenAddress: string, amount: bigint) {
        // No-op for CellarHook raid
        return "0x";
    },

    async claim(client: any, accountAddress?: string) {
        const contractConfig = CONTRACT_REGISTRY.THECELLAR;
        const contractAddress = getContractAddress(contractConfig);

        if (!contractAddress) throw new Error("TheCellar contract not found");

        let account = client.account;
        if (!account && accountAddress) {
            account = accountAddress as `0x${string}`;
        }

        if (!account) {
            throw new Error("Account not found.");
        }

        const state = await this.getCellarState();

        // Add buffer to max price (5%)
        const price = parseEther(state.currentPrice);
        const maxPaymentAmount = (price * 105n) / 100n;

        const hash = await client.writeContract({
            address: contractAddress,
            abi: contractConfig.abi,
            functionName: 'raid',
            chain: monad,
            account: account,
            args: [maxPaymentAmount],
        });

        return hash;
    },

    async getUserLpBalance(address: string): Promise<bigint> {
        const contractConfig = CONTRACT_REGISTRY.THECELLAR;
        const contractAddress = getContractAddress(contractConfig);
        if (!contractAddress) return 0n;

        const publicClient = createPublicClient({
            chain: monad,
            transport: http(),
        });

        const balance = await publicClient.readContract({
            address: contractAddress,
            abi: contractConfig.abi,
            functionName: 'balanceOf',
            args: [address],
        });

        return balance as bigint;
    },

    async getKeepAllowance(owner: string, spender: string): Promise<bigint> {
        const keepConfig = CONTRACT_REGISTRY.KEEP_TOKEN;
        const keepAddress = getContractAddress(keepConfig);
        if (!keepAddress) return 0n;

        const publicClient = createPublicClient({
            chain: monad,
            transport: http(),
        });

        const allowance = await publicClient.readContract({
            address: keepAddress,
            abi: keepConfig.abi,
            functionName: 'allowance',
            args: [owner, spender],
        });

        return allowance as bigint;
    },

    async approveKeep(client: any, spender: string, amount: bigint) {
        const keepConfig = CONTRACT_REGISTRY.KEEP_TOKEN;
        const keepAddress = getContractAddress(keepConfig);
        if (!keepAddress) throw new Error("KEEP token not found");

        const hash = await client.writeContract({
            address: keepAddress,
            abi: keepConfig.abi,
            functionName: 'approve',
            chain: monad,
            account: client.account,
            args: [spender, amount],
        });

        return hash;
    }
};
