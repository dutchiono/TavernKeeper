
import { createPublicClient, http, decodeEventLog, parseAbiItem } from 'viem';
import { monad } from '../lib/chains';

const INIT_TX_HASH = '0x9abebd9be786ae360f29f7ef0da53d2ab4eac7960fd8ad782735ef1cb02c01f2';

async function main() {
    console.log(`🔍 Decoding Initialization TX: ${INIT_TX_HASH}`);

    const client = createPublicClient({
        transport: http('https://rpc.monad.xyz'),
    });

    try {
        const tx = await client.getTransactionReceipt({ hash: INIT_TX_HASH });

        if (!tx) {
            console.log('❌ Transaction NOT FOUND');
            return;
        }

        console.log(`✅ Found TX in block ${tx.blockNumber}`);

        // Define the ABI event we are looking for
        const abiItem = parseAbiItem('event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks)');

        let found = false;
        for (const log of tx.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: [abiItem],
                    data: log.data,
                    topics: log.topics,
                });

                if (decoded.eventName === 'Initialize') {
                    console.log('\n⭐️ FOUND INITIALIZE EVENT ⭐️');
                    console.log(`ID: ${decoded.args.id}`);
                    console.log(`Currency0: ${decoded.args.currency0}`);
                    console.log(`Currency1: ${decoded.args.currency1}`);
                    console.log(`Fee: ${decoded.args.fee}`);
                    console.log(`TickSpacing: ${decoded.args.tickSpacing}`);
                    console.log(`Hooks: ${decoded.args.hooks}`);
                    found = true;
                }
            } catch (e) {
                // Not the event we are looking for
            }
        }

        if (!found) {
            console.log('\n❌ No Initialize event found in logs. Check if ABI matches.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main().catch(console.error);
