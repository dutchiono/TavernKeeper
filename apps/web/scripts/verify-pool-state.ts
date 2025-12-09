
import { createPublicClient, http, encodeAbiParameters, keccak256, formatEther } from 'viem';
import { monad } from '../lib/chains';

// Monad Mainnet Addresses (Chain ID: 143)
const MAINNET_COMMON = {
    POOL_MANAGER: '0x27e98f6A0D3315F9f3ECDaFE0187a7637F41c7c2',
    KEEP_TOKEN: '0x2D1094F5CED6ba279962f9676d32BE092AFbf82E',
};

const HOOK_CANDIDATES = [
    { name: 'v2 (Current)', address: '0xe71CAf7162dd81a4A9C0c6BD25ED02C26F492DC0' },
    { name: 'v1 (Deprecated)', address: '0xaDF53E062195C20DAD2E52b76550f0a266e40ac0' },
    { name: 'Old (Broken)', address: '0x6c7612F44B71E5E6E2bA0FEa799A23786A537755' },
    { name: 'Accidental', address: '0xDA499a900FE25D738045CD6C299663471dE76Ae0' },
    { name: 'No Hook', address: '0x0000000000000000000000000000000000000000' }
];

const FEE_OPTIONS = [100, 500, 3000, 10000];
const TICK_SPACING_OPTIONS = [10, 60, 100, 200];

async function checkPoolManagerBalances(rpc: string) {
    console.log(`\n💰 Checking PoolManager Balances directly...`);
    try {
        const publicClient = createPublicClient({ transport: http(rpc) });

        const monBalance = await publicClient.getBalance({ address: MAINNET_COMMON.POOL_MANAGER as `0x${string}` });
        const keepBalance = await publicClient.readContract({
            address: MAINNET_COMMON.KEEP_TOKEN as `0x${string}`,
            abi: [{ name: 'balanceOf', type: 'function', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
            functionName: 'balanceOf',
            args: [MAINNET_COMMON.POOL_MANAGER as `0x${string}`]
        }) as bigint;

        console.log(`   PoolManager MON: ${formatEther(monBalance)}`);
        console.log(`   PoolManager KEEP: ${formatEther(keepBalance)}`);

        if (monBalance > 0n || keepBalance > 0n) {
            console.log(`   ✅ PoolManager HAS FUNDS! Valid pool exists somewhere.`);
        } else {
            console.log(`   ❌ PoolManager is EMPTY. No liquidity exists.`);
        }
    } catch (e) {
        console.error("Error checking balances:", e);
    }
}

async function checkHook(name: string, hookAddress: string, rpc: string) {
    console.log(`\n🔍 Scanning Hook: ${name} (${hookAddress})`);

    const publicClient = createPublicClient({ transport: http(rpc) });

    for (const fee of FEE_OPTIONS) {
        for (const tickSpacing of TICK_SPACING_OPTIONS) {
            const POOL_KEY = {
                currency0: '0x0000000000000000000000000000000000000000', // MON
                currency1: MAINNET_COMMON.KEEP_TOKEN,
                fee: fee,
                tickSpacing: tickSpacing,
                hooks: hookAddress
            };

            const encoded = encodeAbiParameters(
                [
                    { type: 'address', name: 'currency0' },
                    { type: 'address', name: 'currency1' },
                    { type: 'uint24', name: 'fee' },
                    { type: 'int24', name: 'tickSpacing' },
                    { type: 'address', name: 'hooks' },
                ],
                [
                    POOL_KEY.currency0 as `0x${string}`,
                    POOL_KEY.currency1 as `0x${string}`,
                    POOL_KEY.fee,
                    POOL_KEY.tickSpacing,
                    POOL_KEY.hooks as `0x${string}`,
                ]
            );

            const poolId = keccak256(encoded);

            // Check Slot0
            const POOLS_SLOT = 0n;
            const slot0StorageSlot = keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'uint256' }], [poolId, POOLS_SLOT]));
            const slot0Value = await publicClient.getStorageAt({
                address: MAINNET_COMMON.POOL_MANAGER as `0x${string}`,
                slot: slot0StorageSlot,
            });

            if (slot0Value && BigInt(slot0Value) !== 0n) {
                const val = BigInt(slot0Value);
                const sqrtPriceX96 = val & ((1n << 160n) - 1n);
                const Q96 = 2n ** 96n;
                const price = Number(sqrtPriceX96) / Number(Q96);

                console.log(`   ✅ FOUND INITIALIZED POOL!`);
                console.log(`      Fee: ${fee}`);
                console.log(`      TickSpacing: ${tickSpacing}`);
                console.log(`      Pool ID: ${poolId}`);
                console.log(`      Price: ${price ** 2}`);
                return; // Stop after finding match for this hook
            }
        }
    }
    console.log(`   ❌ No pools found for this hook (checked common params)`);
}

async function main() {
    const RPC = 'https://rpc.monad.xyz';
    console.log(`Using RPC: ${RPC}`);

    await checkPoolManagerBalances(RPC);

    for (const cand of HOOK_CANDIDATES) {
        await checkHook(cand.name, cand.address, RPC);
    }
}

main().catch(console.error);
