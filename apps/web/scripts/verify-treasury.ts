
import { createPublicClient, http, parseAbi } from 'viem';
import { monad } from '../lib/chains';
import { CONTRACT_ADDRESSES } from '../lib/contracts/addresses';

const TAVERN_KEEPER = CONTRACT_ADDRESSES.TAVERNKEEPER;

async function main() {
    console.log('🔍 Checking TavernKeeper Treasury...');
    console.log(`TavernKeeper: ${TAVERN_KEEPER}`);

    const client = createPublicClient({
        chain: monad,
        transport: http('https://rpc.monad.xyz')
    });

    const abi = parseAbi([
        'function treasury() view returns (address)',
        'function slot0() view returns (uint8,uint16,uint192,uint40,uint256,address,string)'
    ]);

    try {
        const treasury = await client.readContract({
            address: TAVERN_KEEPER as `0x${string}`,
            abi: abi,
            functionName: 'treasury'
        });
        console.log(`Treasury Address: ${treasury}`);

        const slot0 = await client.readContract({
            address: TAVERN_KEEPER as `0x${string}`,
            abi: abi,
            functionName: 'slot0'
        });
        console.log(`Slot0:`, slot0);

    } catch (e) {
        console.error('Error reading TavernKeeper:', e);
    }
}

main().catch(console.error);
