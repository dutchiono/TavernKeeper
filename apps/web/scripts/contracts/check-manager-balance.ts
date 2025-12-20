
import { createPublicClient, http, formatEther } from 'viem';
import { monad } from '../lib/chains';

const CONFIG = {
    POOL_MANAGER: '0x27e98f6A0D3315F9f3ECDaFE0187a7637F41c7c2',
    KEEP_TOKEN: '0x2D1094F5CED6ba279962f9676d32BE092AFbf82E',
};

async function main() {
    console.log('🔍 Checking PoolManager Total Balances...');
    console.log(`PoolManager: ${CONFIG.POOL_MANAGER}`);

    const client = createPublicClient({ transport: http('https://rpc.monad.xyz') });

    try {
        // Check MON (Native) Balance
        const monBalance = await client.getBalance({ address: CONFIG.POOL_MANAGER as `0x${string}` });

        // Check KEEP (ERC20) Balance
        const keepBalance = await client.readContract({
            address: CONFIG.KEEP_TOKEN as `0x${string}`,
            abi: [{ name: 'balanceOf', type: 'function', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
            functionName: 'balanceOf',
            args: [CONFIG.POOL_MANAGER as `0x${string}`],
        }) as bigint;

        console.log('-------------------------------------------');
        console.log(`PoolManager MON Balance:  ${formatEther(monBalance)}`);
        console.log(`PoolManager KEEP Balance: ${formatEther(keepBalance)}`);
        console.log('-------------------------------------------');

        if (formatEther(monBalance).startsWith('7.639') && formatEther(keepBalance).startsWith('7.42')) {
            console.log('✅ MATCHES FRONTEND DISPLAY!');
            console.log('Hypothesis Confirmed: Frontend is showing PoolManager total balance, not active Pool liquidity.');
        } else {
            console.log('❌ DOES NOT MATCH FRONTEND.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main().catch(console.error);
