
import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { monad } from '../lib/chains';

const MAINNET_POOL_MANAGER = '0x27e98f6A0D3315F9f3ECDaFE0187a7637F41c7c2';

async function main() {
    console.log('🔍 Scanning PoolManager for Initialize events...');
    console.log(`PoolManager: ${MAINNET_POOL_MANAGER}`);

    const client = createPublicClient({
        transport: http('https://rpc.monad.xyz'),
    });

    // Event signature: 
    // event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks);
    // Note: The signature in V4 might just be:
    // event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick);
    // Actually, looking at IEvents.sol in V4-core:
    // event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks);

    // We'll search for the event signature for "Initialize" 
    // The standard V4 event is: Initialize(bytes32 id, address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)

    const logs = await client.getLogs({
        address: MAINNET_POOL_MANAGER as `0x${string}`,
        event: parseAbiItem('event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks)'),
        fromBlock: 'earliest',
        toBlock: 'latest'
    });

    console.log(`\nFound ${logs.length} pools initialized!`);

    for (const log of logs) {
        const { id, currency0, currency1, fee, tickSpacing, hooks } = log.args;
        console.log('-------------------------------------------');
        console.log(`Pool ID: ${id}`);
        console.log(`Currency0: ${currency0}`);
        console.log(`Currency1: ${currency1}`);
        console.log(`Fee: ${fee}`);
        console.log(`TickSpacing: ${tickSpacing}`);
        console.log(`Hooks: ${hooks}`);

        // Check if this hook matches any of our known candidates
        // Candidates: 
        // v2: 0xe71CAf7162dd81a4A9C0c6BD25ED02C26F492DC0
        // v1: 0xaDF53E062195C20DAD2E52b76550f0a266e40ac0
        // Old: 0x6c7612F44B71E5E6E2bA0FEa799A23786A537755

        if (hooks?.toLowerCase() === '0xe71CAf7162dd81a4A9C0c6BD25ED02C26F492DC0'.toLowerCase()) {
            console.log('⭐️ THIS MATCHES v2 CANDIDATE');
        }
    }
}

main().catch(console.error);
