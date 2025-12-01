import { createPublicClient, formatEther, http } from 'viem';
import { CONTRACT_REGISTRY, getContractAddress } from '../contracts/registry';
import { monad } from '../chains';

export const keepTokenService = {
    /**
     * Get KEEP token balance for an address
     */
    async getBalance(address: string): Promise<string> {
        try {
            const contractConfig = CONTRACT_REGISTRY.KEEP_TOKEN;
            const contractAddress = getContractAddress(contractConfig);

            if (!contractAddress) {
                console.warn('KEEP token contract address not found. Set NEXT_PUBLIC_KEEP_TOKEN_ADDRESS in .env');
                return '0';
            }

            const publicClient = createPublicClient({
                chain: monad,
                transport: http(),
            });

            const balance = await publicClient.readContract({
                address: contractAddress,
                abi: contractConfig.abi,
                functionName: 'balanceOf',
                args: [address],
            }) as bigint;

            return balance.toString();
        } catch (error) {
            console.error('Error fetching KEEP balance:', error);
            return '0';
        }
    },

    /**
     * Get KEEP token balance for a Token Bound Account (TBA)
     * This is used to check how much gold/KEEP a specific hero/NPC has
     */
    async getTBABalance(tbaAddress: string): Promise<string> {
        return this.getBalance(tbaAddress);
    },

    /**
     * Format KEEP balance for display (e.g. "100.00")
     */
    formatBalance(balance: string | bigint): string {
        const val = typeof balance === 'string' ? BigInt(balance) : balance;
        return parseFloat(formatEther(val)).toFixed(2);
    }
};
