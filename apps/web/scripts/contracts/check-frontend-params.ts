
import { createPublicClient, http, encodeAbiParameters, keccak256, formatEther } from 'viem';
import { monad } from '../lib/chains';

// Configuration from frontend code
const CONFIG = {
    POOL_MANAGER: '0x27e98f6A0D3315F9f3ECDaFE0187a7637F41c7c2',
    KEEP_TOKEN: '0x2D1094F5CED6ba279962f9676d32BE092AFbf82E',
    THE_CELLAR: '0xe71CAf7162dd81a4A9C0c6BD25ED02C26F492DC0', // From addresses.ts
    FEE: 10000,
    TICK_SPACING: 200
};

async function main() {
    console.log('🔍 Checking Exact Frontend Configuration...');
    console.log(`RPC: https://rpc.monad.xyz`);
    console.log(`Hook: ${CONFIG.THE_CELLAR}`);
    console.log(`Fee: ${CONFIG.FEE}`);
    console.log(`TickSpacing: ${CONFIG.TICK_SPACING}`);

    const client = createPublicClient({ transport: http('https://rpc.monad.xyz') });

    // 1. Calculate Pool ID
    const encoded = encodeAbiParameters(
        [
            { type: 'address', name: 'currency0' },
            { type: 'address', name: 'currency1' },
            { type: 'uint24', name: 'fee' },
            { type: 'int24', name: 'tickSpacing' },
            { type: 'address', name: 'hooks' },
        ],
        [
            '0x0000000000000000000000000000000000000000', // MON
            CONFIG.KEEP_TOKEN as `0x${string}`,
            CONFIG.FEE,
            CONFIG.TICK_SPACING,
            CONFIG.THE_CELLAR as `0x${string}`,
        ]
    );

    const poolId = keccak256(encoded);
    console.log(`Pool ID: ${poolId}`);

    // 2. Query Slot0
    const slot0StorageSlot = keccak256(encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'uint256' }],
        [poolId, 0n] // Slot 0
    ));

    console.log(`Reading storage slot: ${slot0StorageSlot}`);

    try {
        const slot0Value = await client.getStorageAt({
            address: CONFIG.POOL_MANAGER as `0x${string}`,
            slot: slot0StorageSlot,
        });

        console.log(`Raw Slot0 Value: ${slot0Value}`);

        if (!slot0Value || BigInt(slot0Value) === 0n) {
            console.log('❌ NOT INITIALIZED (Slot0 is empty)');
        } else {
            console.log('✅ INITIALIZED!');
            const val = BigInt(slot0Value);
            const sqrtPriceX96 = val & ((1n << 160n) - 1n);
            const Q96 = 2n ** 96n;
            const price = Number(sqrtPriceX96) / Number(Q96);
            console.log(`Price: ${price ** 2}`);
        }
    } catch (e) {
        console.error('Error reading storage:', e);
    }
}

main().catch(console.error);
