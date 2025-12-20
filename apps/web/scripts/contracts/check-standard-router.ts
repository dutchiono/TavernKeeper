
import { createPublicClient, http } from 'viem';
import { monad } from '../lib/chains';

const STANDARD_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // SwapRouter02
const UNIVERSAL_ROUTER = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'; // Universal Router

async function main() {
    const client = createPublicClient({ chain: monad, transport: http('https://rpc.monad.xyz') });

    console.log(`Checking for Standard SwapRouter02 at ${STANDARD_ROUTER}...`);
    const code = await client.getBytecode({ address: STANDARD_ROUTER as `0x${string}` });

    if (code && code !== '0x') {
        console.log('✅ FOUND Standard SwapRouter02!');
    } else {
        console.log('❌ SwapRouter02 NOT found.');
    }

    console.log(`Checking for Universal Router at ${UNIVERSAL_ROUTER}...`);
    const code2 = await client.getBytecode({ address: UNIVERSAL_ROUTER as `0x${string}` });
    if (code2 && code2 !== '0x') {
        console.log('✅ FOUND Universal Router!');
    } else {
        console.log('❌ Universal Router NOT found.');
    }
}

main().catch(console.error);
