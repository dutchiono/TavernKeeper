
import { createPublicClient, http, formatEther, parseAbi } from 'viem';
import { monad } from '../lib/chains';

const CELLAR_V3 = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';
const KEEP = '0x2D1094F5CED6ba279962f9676d32BE092AFbf82E';
const WMON = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A'; // Correct WMON address

async function main() {
    console.log('🔍 Checking TheCellarV3 Balances...');
    console.log(`Cellar: ${CELLAR_V3}`);

    const client = createPublicClient({ chain: monad, transport: http('https://rpc.monad.xyz') });

    const keepBalance = await client.readContract({
        address: KEEP as `0x${string}`,
        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
        functionName: 'balanceOf',
        args: [CELLAR_V3]
    });

    const wmonBalance = await client.readContract({
        address: WMON as `0x${string}`,
        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
        functionName: 'balanceOf',
        args: [CELLAR_V3]
    });

    const monBalance = await client.getBalance({ address: CELLAR_V3 as `0x${string}` });

    console.log(`   KEEP: ${formatEther(keepBalance as bigint)}`);
    console.log(`   WMON: ${formatEther(wmonBalance as bigint)}`);
    console.log(`   MON:  ${formatEther(monBalance)}`);

    // Check Token ID
    try {
        const tokenId = await client.readContract({
            address: CELLAR_V3 as `0x${string}`,
            abi: parseAbi(['function tokenId() view returns (uint256)']),
            functionName: 'tokenId',
        });
        console.log(`   Managed Token ID: ${tokenId}`);
    } catch (e) {
        console.log('   Could not read tokenId (might not be V3 contract?)');
    }
}

main().catch(console.error);
