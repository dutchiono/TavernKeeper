import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

const CELLAR_ABI = [
    'function totalLiquidity() view returns (uint256)',
    'function getAuctionPrice() view returns (uint256)',
    'function potBalanceMON() view returns (uint256)',
    'event LiquidityAdded(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidityMinted)',
    'event Raid(address indexed user, uint256 lpBurned, uint256 monPayout, uint256 keepPayout, uint256 newInitPrice, uint256 newEpochId)'
];

async function main() {
    console.log("🔍 INVESTIGATING CLP SCALING ISSUE\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);

    // Get current state
    const [totalLiquidity, currentRaidPrice, potBalanceMON] = await Promise.all([
        cellar.totalLiquidity(),
        cellar.getAuctionPrice(),
        cellar.potBalanceMON()
    ]);

    console.log("📊 CURRENT STATE:");
    console.log(`   Total CLP Supply: ${totalLiquidity.toString()}`);
    console.log(`   Current Raid Price: ${ethers.formatEther(currentRaidPrice)} CLP`);
    console.log(`   Pot Balance: ${ethers.formatEther(potBalanceMON)} MON\n`);

    // Get ALL historical events to see the pattern
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`Querying ALL LiquidityAdded events from block 0 to ${currentBlock}...\n`);

    // Query in chunks
    const chunkSize = 10000;
    let allEvents: any[] = [];
    let fromBlock = 0;

    while (fromBlock < currentBlock) {
        const toBlock = Math.min(fromBlock + chunkSize, currentBlock);
        try {
            const events = await cellar.queryFilter(
                cellar.filters.LiquidityAdded(),
                fromBlock,
                toBlock
            );
            allEvents = allEvents.concat(events);
            fromBlock = toBlock + 1;
            if (events.length > 0) {
                console.log(`   Found ${events.length} events in blocks ${fromBlock - chunkSize}-${toBlock}`);
            }
        } catch (e: any) {
            console.log(`   Error querying blocks ${fromBlock}-${toBlock}: ${e.message}`);
            fromBlock = toBlock + 1;
        }
    }

    console.log(`\nTotal events found: ${allEvents.length}\n`);

    if (allEvents.length === 0) {
        console.log("No events found. Cannot analyze.");
        return;
    }

    // Analyze the pattern
    console.log("📈 ANALYZING PATTERN:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let totalMonAdded = 0n;
    let totalKeepAdded = 0n;
    let totalLiquidityMinted = 0n;

    for (const event of allEvents) {
        if (event.args) {
            const amount0 = BigInt(event.args[1].toString());
            const amount1 = BigInt(event.args[2].toString());
            const liquidity = BigInt(event.args[3].toString());

            totalMonAdded += amount0;
            totalKeepAdded += amount1;
            totalLiquidityMinted += liquidity;
        }
    }

    console.log(`   Total MON Added: ${ethers.formatEther(totalMonAdded)} MON`);
    console.log(`   Total KEEP Added: ${ethers.formatEther(totalKeepAdded)} KEEP`);
    console.log(`   Total Liquidity Minted: ${totalLiquidityMinted.toString()} CLP\n`);

    // Calculate ratios
    const monPerCLP = totalLiquidityMinted > 0n ? (totalMonAdded * BigInt(1e18)) / totalLiquidityMinted : 0n;
    const keepPerCLP = totalLiquidityMinted > 0n ? (totalKeepAdded * BigInt(1e18)) / totalLiquidityMinted : 0n;

    console.log("💰 RATIOS:");
    console.log(`   MON per CLP (scaled): ${ethers.formatEther(monPerCLP)} MON per 1e18 CLP`);
    console.log(`   KEEP per CLP (scaled): ${ethers.formatEther(keepPerCLP)} KEEP per 1e18 CLP\n`);

    // Calculate what 802 CLP should cost
    const monFor802 = (totalMonAdded * 802n) / totalLiquidityMinted;
    const keepFor802 = (totalKeepAdded * 802n) / totalLiquidityMinted;

    console.log("🎯 WHAT 802 CLP ACTUALLY COSTS (based on historical average):");
    console.log(`   MON: ${ethers.formatEther(monFor802)} MON`);
    console.log(`   KEEP: ${ethers.formatEther(keepFor802)} KEEP\n`);

    // Now check raids to see what people actually burned
    console.log("⚔️  CHECKING RECENT RAIDS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    fromBlock = Math.max(0, currentBlock - 50000);
    const raidEvents = await cellar.queryFilter(
        cellar.filters.Raid(),
        fromBlock,
        currentBlock
    ).catch(() => []);

    console.log(`Found ${raidEvents.length} raid events\n`);

    if (raidEvents.length > 0) {
        for (const event of raidEvents.slice(-5)) {
            if (event.args) {
                const lpBurned = BigInt(event.args[1].toString());
                const monPayout = BigInt(event.args[2].toString());
                const keepPayout = BigInt(event.args[3].toString());

                console.log(`   Raid:`);
                console.log(`     Burned: ${lpBurned.toString()} CLP`);
                console.log(`     Got: ${ethers.formatEther(monPayout)} MON + ${ethers.formatEther(keepPayout)} KEEP`);

                // Calculate what those CLP should have cost to mint
                const shouldHaveCostMon = (totalMonAdded * lpBurned) / totalLiquidityMinted;
                const shouldHaveCostKeep = (totalKeepAdded * lpBurned) / totalLiquidityMinted;

                console.log(`     Should have cost to mint: ${ethers.formatEther(shouldHaveCostMon)} MON + ${ethers.formatEther(shouldHaveCostKeep)} KEEP`);
                console.log(`     ROI: ${ethers.formatEther((monPayout * BigInt(1e18)) / shouldHaveCostMon)}x (MON)\n`);
            }
        }
    }

    console.log("\n⚠️  THE PROBLEM:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("If 802 CLP costs almost nothing to mint, but you need 802 CLP to raid,");
    console.log("then raiding is essentially FREE - you can mint 802 CLP for pennies and get 772 MON!");
    console.log("\nThis breaks the economics. The raid price should be meaningful.\n");

    console.log("💡 POSSIBLE SOLUTIONS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. CLP tokens should be SCALED DOWN (divide by 1e18 or similar)");
    console.log("   Example: Instead of minting 6T CLP for 5 MON, mint 6 CLP");
    console.log("   Then 802 CLP would cost ~668 MON (802/6 * 5)");
    console.log("\n2. CLP tokens should represent MON amounts, not liquidity units");
    console.log("   Example: 1 MON added = 1 CLP token minted");
    console.log("   Then 802 CLP = 802 MON worth of liquidity");
    console.log("\n3. The raid price calculation is wrong - should use different units");
    console.log("   Maybe raid price should be in MON equivalent, not raw CLP?\n");

    // Calculate what scaling factor would make sense
    if (totalLiquidityMinted > 0n && totalMonAdded > 0n) {
        // If we want 1 MON = 1 CLP (approximately)
        const scalingFactor = totalLiquidityMinted / totalMonAdded;
        console.log("🔧 SCALING ANALYSIS:");
        console.log(`   Current: 1 MON = ${scalingFactor.toString()} CLP tokens`);
        console.log(`   To get 1 MON ≈ 1 CLP, divide CLP by: ${scalingFactor.toString()}`);
        console.log(`   Or multiply MON by: ${scalingFactor.toString()} when minting CLP\n`);

        // What would 802 CLP cost with proper scaling?
        const scaled802CLP = 802n * scalingFactor;
        const monForScaled802 = (totalMonAdded * scaled802CLP) / totalLiquidityMinted;
        console.log(`   With scaling: 802 CLP would represent ${scaled802CLP.toString()} liquidity units`);
        console.log(`   Which should cost: ${ethers.formatEther(monForScaled802)} MON`);
        console.log(`   (This makes sense! ~802 MON for 802 CLP)\n`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

