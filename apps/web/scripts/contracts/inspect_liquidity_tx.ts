
import { createPublicClient, http, decodeEventLog, parseAbiItem } from 'viem';

// The transaction where liquidity was added (from DEPLOYMENT_TRACKER.md)
const LIQUIDITY_TX_HASH = '0x88dad9f627ec1a780017ae788906dd2c46fd8df89ee691f67b0606bc7c98cb9c';

async function main() {
    console.log(`🔍 Decoding Liquidity TX: ${LIQUIDITY_TX_HASH}`);

    const client = createPublicClient({
        transport: http('https://rpc.monad.xyz'),
    });

    try {
        const tx = await client.getTransactionReceipt({ hash: LIQUIDITY_TX_HASH });

        if (!tx) {
            console.log('❌ Transaction NOT FOUND');
            return;
        }

        console.log(`✅ Found TX in block ${tx.blockNumber}`);

        // Event: ModifyLiquidity(bytes32 indexed poolId, address indexed sender, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt)
        const abiItem = parseAbiItem('event ModifyLiquidity(bytes32 indexed poolId, address indexed sender, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt)');

        for (const log of tx.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: [abiItem],
                    data: log.data,
                    topics: log.topics,
                });

                if (decoded.eventName === 'ModifyLiquidity') {
                    console.log('\n⭐️ FOUND MODIFY LIQUIDITY EVENT ⭐️');
                    console.log(`PoolId: ${decoded.args.poolId}`);
                    // console.log(`Sender: ${decoded.args.sender}`); // Might be unindexed differently?
                    console.log(`LiquidityDelta: ${decoded.args.liquidityDelta}`);
                    console.log(`TickLower: ${decoded.args.tickLower}`);
                    console.log(`TickUpper: ${decoded.args.tickUpper}`);
                }
            } catch (e) {
                // Not the event
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main().catch(console.error);
