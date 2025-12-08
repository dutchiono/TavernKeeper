import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

// ABI for TheCellarV3
const CELLAR_ABI = [
    'function getAuctionPrice() view returns (uint256)',
    'function slot0() view returns (uint8 locked, uint16 epochId, uint192 initPrice, uint40 startTime)',
    'function epochPeriod() view returns (uint256)',
    'function minInitPrice() view returns (uint256)',
    'function raid(uint256 lpBid)',
    'event Raid(address indexed user, uint256 lpBurned, uint256 monPayout, uint256 keepPayout, uint256 newInitPrice, uint256 newEpochId)'
];

// Calculate auction price from slot0 state (matches getPriceFromCache logic)
function calculateAuctionPrice(slot0: any, blockTimestamp: number, epochPeriod: bigint, minInitPrice: bigint): bigint {
    const initPrice = BigInt(slot0.initPrice.toString());
    const startTime = BigInt(slot0.startTime.toString());
    const timePassed = BigInt(blockTimestamp) - startTime;

    if (timePassed > epochPeriod) {
        return minInitPrice;
    }

    // calculatedPrice = initPrice - (initPrice * timePassed) / epochPeriod
    const calculatedPrice = initPrice - (initPrice * timePassed) / epochPeriod;
    return calculatedPrice < minInitPrice ? minInitPrice : calculatedPrice;
}

async function analyzeRaidEvent(
    event: ethers.Log,
    cellar: ethers.Contract,
    epochPeriod: bigint,
    minInitPrice: bigint
) {
    const block = await ethers.provider.getBlock(event.blockNumber);

    if (!event.args) {
        console.log(`⚠️  Event: Missing args`);
        return;
    }

    const user = event.args[0];
    const lpBurned = event.args[1];
    const monPayout = event.args[2];
    const keepPayout = event.args[3];
    const newInitPrice = event.args[4];
    const newEpochId = event.args[5];

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 RAID (Block ${event.blockNumber})`);
    console.log(`   Timestamp: ${new Date(Number(block.timestamp) * 1000).toISOString()}`);
    console.log(`   Transaction: ${event.transactionHash}`);
    console.log(`   User: ${user}`);
    console.log(`   Epoch ID: ${newEpochId}`);
    console.log(`\n💰 ACTUAL LP SPENT:`);
    console.log(`   LP Burned: ${ethers.formatEther(lpBurned)} CLP`);
    console.log(`\n💵 PAYOUTS:`);
    console.log(`   MON Payout: ${ethers.formatEther(monPayout)} MON`);
    console.log(`   KEEP Payout: ${ethers.formatEther(keepPayout)} KEEP`);
    console.log(`\n📈 NEW AUCTION STATE:`);
    console.log(`   New Init Price: ${ethers.formatEther(newInitPrice)} CLP`);

    // Calculate the auction price at the time of the raid
    const blockBeforeRaid = event.blockNumber - 1;
    if (blockBeforeRaid >= 0) {
        try {
            // Get slot0 state just before the raid (at the previous block)
            const historicalSlot0 = await cellar.slot0({ blockTag: blockBeforeRaid });
            const blockBefore = await ethers.provider.getBlock(blockBeforeRaid);

            // Calculate what the auction price should have been at that time
            const auctionPriceAtRaid = calculateAuctionPrice(
                historicalSlot0,
                Number(blockBefore.timestamp),
                epochPeriod,
                minInitPrice
            );

            const lpBurnedNum = parseFloat(ethers.formatEther(lpBurned));
            const auctionPriceNum = parseFloat(ethers.formatEther(auctionPriceAtRaid));

            console.log(`\n📊 ON-CHAIN DATA:`);
            console.log(`   Init Price Before Raid: ${ethers.formatEther(historicalSlot0.initPrice)} CLP`);
            console.log(`   Start Time Before Raid: ${historicalSlot0.startTime} (${new Date(Number(historicalSlot0.startTime) * 1000).toISOString()})`);
            console.log(`   Auction Price (calculated): ${auctionPriceNum.toFixed(6)} CLP`);
            console.log(`   LP Actually Burned: ${lpBurnedNum.toFixed(6)} CLP`);
            console.log(`   Difference: ${(lpBurnedNum - auctionPriceNum).toFixed(6)} CLP`);

            if (lpBurnedNum < 10) {
                console.log(`   ✅ GOOD: LP burned is less than 10 CLP`);
            } else if (lpBurnedNum > 50) {
                console.log(`   ❌ BAD: LP burned is more than 50 CLP`);
            } else {
                console.log(`   ⚠️  LP burned is between 10-50 CLP`);
            }
        } catch (historicalError: any) {
            console.log(`   ⚠️  Could not query historical state: ${historicalError.message}`);
        }
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

async function main() {
    console.log("🔍 CHECKING RECENT RAIDS\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);

    // Get current auction state and config
    const slot0 = await cellar.slot0();
    const currentPrice = await cellar.getAuctionPrice();
    const epochPeriod = await cellar.epochPeriod();
    const minInitPrice = await cellar.minInitPrice();

    console.log("📊 Current Auction State:");
    console.log(`   Epoch ID: ${slot0.epochId}`);
    console.log(`   Init Price: ${ethers.formatEther(slot0.initPrice)} CLP`);
    console.log(`   Start Time: ${slot0.startTime} (${new Date(Number(slot0.startTime) * 1000).toISOString()})`);
    console.log(`   Current Price: ${ethers.formatEther(currentPrice)} CLP`);
    console.log(`   Epoch Period: ${epochPeriod} seconds (${Number(epochPeriod) / 3600} hours)`);
    console.log(`   Min Init Price: ${ethers.formatEther(minInitPrice)} CLP\n`);

    // Check if a transaction hash was provided via environment variable
    const txHash = process.env.TX_HASH;

    if (txHash) {
        console.log(`🔎 Analyzing specific transaction: ${txHash}\n`);

        try {
            const receipt = await ethers.provider.getTransactionReceipt(txHash);
            if (!receipt) {
                console.log(`❌ Transaction not found: ${txHash}`);
                return;
            }

            // Find Raid event in the receipt
            const iface = new ethers.Interface(CELLAR_ABI);
            const raidEvent = receipt.logs.find(log => {
                try {
                    const parsed = iface.parseLog(log);
                    return parsed && parsed.name === 'Raid';
                } catch {
                    return false;
                }
            });

            if (!raidEvent) {
                console.log(`❌ No Raid event found in transaction ${txHash}`);
                return;
            }

            const parsedEvent = iface.parseLog(raidEvent);
            if (parsedEvent) {
                // Create a proper event object with block number and transaction hash
                const eventWithMetadata = {
                    ...parsedEvent,
                    blockNumber: receipt.blockNumber,
                    transactionHash: receipt.hash,
                    args: parsedEvent.args
                };
                await analyzeRaidEvent(eventWithMetadata as any, cellar, epochPeriod, minInitPrice);
            }
        } catch (error: any) {
            console.error(`❌ Error analyzing transaction: ${error.message}`);
            return;
        }
    } else {
        // Query recent Raid events (RPC limit is 100 blocks, so we'll query in chunks)
        const currentBlock = await ethers.provider.getBlockNumber();
        const maxBlocksToSearch = 50000; // Search last 50k blocks (much further back)
        const chunkSize = 100; // RPC limit
        const fromBlock = Math.max(0, currentBlock - maxBlocksToSearch);

        console.log(`🔎 Searching for Raid events from block ${fromBlock} to ${currentBlock} (in ${chunkSize}-block chunks)...\n`);

        const raidFilter = cellar.filters.Raid();
        const allEvents = [];

        // Query in chunks of 100 blocks
        let processed = 0;
        for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
            const end = Math.min(start + chunkSize - 1, currentBlock);
            try {
                const chunkEvents = await cellar.queryFilter(raidFilter, start, end);
                allEvents.push(...chunkEvents);
                processed += chunkSize;
                if (processed % 1000 === 0) {
                    console.log(`   Processed ${processed} blocks...`);
                }
            } catch (error: any) {
                console.log(`⚠️  Error querying blocks ${start}-${end}: ${error.message}`);
            }
        }

        const events = allEvents;

        if (events.length === 0) {
            console.log("❌ No Raid events found in recent blocks.");
            console.log(`   Searched blocks ${fromBlock} to ${currentBlock}`);
            console.log(`\n💡 Tip: You can analyze a specific transaction by setting TX_HASH env var:`);
            console.log(`   $env:TX_HASH="0x..."; npx hardhat run scripts/check-recent-raids.ts --network monad`);
            return;
        }

        console.log(`✅ Found ${events.length} Raid event(s):\n`);

        // Process each raid event (most recent first)
        for (let i = events.length - 1; i >= 0; i--) {
            await analyzeRaidEvent(events[i], cellar, epochPeriod, minInitPrice);
        }
    }

    console.log(`\n✅ Analysis complete!`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

