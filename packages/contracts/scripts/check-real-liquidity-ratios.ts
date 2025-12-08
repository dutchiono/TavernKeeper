import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

const CELLAR_ABI = [
    'event LiquidityAdded(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidityMinted)'
];

async function main() {
    console.log("🔍 CHECKING REAL LIQUIDITY ADDITION RATIOS\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);

    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks (safe range)

    console.log(`Querying LiquidityAdded events from block ${fromBlock} to ${currentBlock}...\n`);

    try {
        const events = await cellar.queryFilter(
            cellar.filters.LiquidityAdded(),
            fromBlock,
            currentBlock
        );

        console.log(`Found ${events.length} LiquidityAdded events\n`);

        if (events.length === 0) {
            console.log("No events found. Cannot verify ratios.");
            return;
        }

        // Show last 10 events with ratios
        const recentEvents = events.slice(-10);

        console.log("📊 RECENT LIQUIDITY ADDITIONS (showing ratios):");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        for (const event of recentEvents) {
            if (event.args) {
                const amount0 = BigInt(event.args[1].toString());
                const amount1 = BigInt(event.args[2].toString());
                const liquidity = BigInt(event.args[3].toString());

                // Calculate ratio: tokens per liquidity unit
                const monPerLiquidity = liquidity > 0n ? (amount0 * 1000000n) / liquidity : 0n;
                const keepPerLiquidity = liquidity > 0n ? (amount1 * 1000000n) / liquidity : 0n;

                console.log(`\n   Block ${event.blockNumber}:`);
                console.log(`   Amount0 (WMON?): ${ethers.formatEther(amount0)}`);
                console.log(`   Amount1 (KEEP?): ${ethers.formatEther(amount1)}`);
                console.log(`   Liquidity Minted: ${liquidity.toString()}`);
                console.log(`   Ratio: ${ethers.formatEther(amount0)} MON + ${ethers.formatEther(amount1)} KEEP = ${liquidity.toString()} liquidity`);

                if (liquidity > 0n) {
                    // For 921 liquidity, what would we need?
                    const monFor921 = (amount0 * 921n) / liquidity;
                    const keepFor921 = (amount1 * 921n) / liquidity;
                    console.log(`   → For 921 liquidity: ${ethers.formatEther(monFor921)} MON + ${ethers.formatEther(keepFor921)} KEEP`);
                }
            }
        }

        // Calculate average ratio
        let totalAmount0 = 0n;
        let totalAmount1 = 0n;
        let totalLiquidity = 0n;

        for (const event of events) {
            if (event.args) {
                totalAmount0 += BigInt(event.args[1].toString());
                totalAmount1 += BigInt(event.args[2].toString());
                totalLiquidity += BigInt(event.args[3].toString());
            }
        }

        if (totalLiquidity > 0n) {
            console.log("\n📈 AVERAGE RATIOS:");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`   Total Amount0: ${ethers.formatEther(totalAmount0)}`);
            console.log(`   Total Amount1: ${ethers.formatEther(totalAmount1)}`);
            console.log(`   Total Liquidity: ${totalLiquidity.toString()}`);

            const avgMonPerLiquidity = (totalAmount0 * 1000000n) / totalLiquidity;
            const avgKeepPerLiquidity = (totalAmount1 * 1000000n) / totalLiquidity;

            console.log(`   Average: ${ethers.formatEther(avgMonPerLiquidity)} MON per 1M liquidity units`);
            console.log(`   Average: ${ethers.formatEther(avgKeepPerLiquidity)} KEEP per 1M liquidity units`);

            // Calculate for 921
            const monFor921 = (totalAmount0 * 921n) / totalLiquidity;
            const keepFor921 = (totalAmount1 * 921n) / totalLiquidity;

            console.log(`\n   ✅ ESTIMATE FOR 921 LIQUIDITY (based on historical average):`);
            console.log(`      MON: ${ethers.formatEther(monFor921)}`);
            console.log(`      KEEP: ${ethers.formatEther(keepFor921)}`);
        }

    } catch (error: any) {
        console.error(`Error querying events: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

