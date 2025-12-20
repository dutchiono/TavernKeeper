
import { createPublicClient, http, encodeFunctionData, parseAbi } from 'viem';
import { monad } from '../lib/chains';

// V3 Addresses from verify_v3_mainnet.ts
const V3_FACTORY = '0x204faca1764b154221e35c0d20abb3c525710498';
const WMON = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A'; // Correct WMON address
const KEEP = '0x2D1094F5CED6ba279962f9676d32BE092AFbf82E';

const FEES = [500, 3000, 10000];

async function main() {
    console.log('🔍 Checking Uniswap V3 Pools...');

    const client = createPublicClient({
        chain: monad,
        transport: http('https://rpc.monad.xyz')
    });

    const factoryAbi = parseAbi([
        'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
    ]);

    for (const fee of FEES) {
        try {
            console.log(`Checking Pool for Fee: ${fee}`);
            const poolAddress = await client.readContract({
                address: V3_FACTORY as `0x${string}`,
                abi: factoryAbi,
                functionName: 'getPool',
                args: [WMON, KEEP, fee]
            });

            console.log(`   Result: ${poolAddress}`);

            if (poolAddress !== '0x0000000000000000000000000000000000000000') {
                console.log(`   ✅ FOUND POOL: ${poolAddress}`);

                // Check Liquidity
                const poolAbi = parseAbi([
                    'function liquidity() external view returns (uint128)',
                    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
                ]);

                const liquidity = await client.readContract({
                    address: poolAddress,
                    abi: poolAbi,
                    functionName: 'liquidity'
                });

                const slot0 = await client.readContract({
                    address: poolAddress,
                    abi: poolAbi,
                    functionName: 'slot0'
                });

                console.log(`      Liquidity: ${liquidity}`);
                console.log(`      SqrtPrice: ${slot0[0]}`);
                console.log(`      Tick: ${slot0[1]}`);
            }

        } catch (e) {
            console.error(`   Error checking fee ${fee}:`, e);
        }
    }
}

main().catch(console.error);
