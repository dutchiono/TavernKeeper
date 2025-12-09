import { createPublicClient, http, parseAbi } from 'viem';
import { monad } from '../lib/chains';
import { CONTRACT_ADDRESSES } from '../lib/contracts/addresses';

const POOL_ABI = parseAbi([
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function liquidity() view returns (uint128)',
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function fee() view returns (uint24)'
]);

async function main() {
    console.log('🔍 Testing V3 Pool State...\n');

    const rpcUrl = process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://rpc.monad.xyz';
    const poolAddress = CONTRACT_ADDRESSES.V3_POOL;

    console.log(`RPC URL: ${rpcUrl}`);
    console.log(`Pool Address: ${poolAddress}\n`);

    if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
        console.error('❌ V3 Pool address not configured!');
        process.exit(1);
    }

    const publicClient = createPublicClient({
        chain: monad,
        transport: http(rpcUrl),
    });

    try {
        console.log('📡 Fetching pool state...\n');

        const [slot0, liquidity, token0, token1, fee] = await Promise.all([
            publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'slot0' }),
            publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'liquidity' }),
            publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'token0' }),
            publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'token1' }),
            publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'fee' })
        ]);

        const sqrtPriceX96 = slot0[0];
        const tick = slot0[1];
        const liquidityValue = liquidity;

        console.log('✅ Pool State Retrieved:\n');
        console.log(`  Token0: ${token0}`);
        console.log(`  Token1: ${token1}`);
        console.log(`  Fee: ${fee} (${Number(fee) / 10000}%)`);
        console.log(`  SqrtPriceX96: ${sqrtPriceX96.toString()}`);
        console.log(`  Tick: ${tick}`);
        console.log(`  Liquidity: ${liquidityValue.toString()}\n`);

        if (sqrtPriceX96 === 0n) {
            console.error('❌ Pool NOT initialized (sqrtPriceX96 = 0)');
            process.exit(1);
        }

        if (liquidityValue === 0n) {
            console.warn('⚠️  Pool initialized but has ZERO liquidity');
        } else {
            console.log('✅ Pool is initialized and has liquidity!');
        }

        // Calculate price
        const Q96 = 2n ** 96n;
        const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
        const price = sqrtPrice * sqrtPrice;
        console.log(`\n  Price (token1/token0): ${price.toFixed(6)}`);

    } catch (error: any) {
        console.error('❌ Error fetching pool state:');
        console.error(error.message);
        if (error.message?.includes('429')) {
            console.error('\n⚠️  Rate limited - too many requests. Wait a moment and try again.');
        }
        process.exit(1);
    }
}

main().catch(console.error);

