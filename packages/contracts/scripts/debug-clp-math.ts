import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

const CELLAR_ABI = [
    'function totalLiquidity() view returns (uint256)',
    'event LiquidityAdded(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidityMinted)'
];

async function main() {
    console.log("🔍 DEBUGGING CLP MATH\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);

    const totalLiquidity = await cellar.totalLiquidity();
    console.log(`Total CLP Supply: ${totalLiquidity.toString()}\n`);

    // Get recent events
    const currentBlock = await ethers.provider.getBlockNumber();
    const events = await cellar.queryFilter(
        cellar.filters.LiquidityAdded(),
        Math.max(0, currentBlock - 1000),
        currentBlock
    );

    if (events.length === 0) {
        console.log("No events found.");
        return;
    }

    const latest = events[events.length - 1];
    const amount0 = BigInt(latest.args![1].toString());
    const amount1 = BigInt(latest.args![2].toString());
    const liquidity = BigInt(latest.args![3].toString());

    console.log("📊 LATEST ADD LIQUIDITY EVENT:");
    console.log(`   Paid: ${ethers.formatEther(amount0)} MON + ${ethers.formatEther(amount1)} KEEP`);
    console.log(`   Got: ${liquidity.toString()} CLP tokens\n`);

    console.log("🧮 THE MATH:");
    console.log(`   ${ethers.formatEther(amount0)} MON creates ${liquidity.toString()} liquidity units`);
    console.log(`   Ratio: 1 MON creates ${liquidity / amount0} liquidity units`);
    console.log(`   Ratio: 1 liquidity unit costs ${(amount0 * ethers.parseEther("1")) / liquidity} MON\n`);

    // Now calculate for different CLP amounts
    const testAmounts = [921n, 802n, 1000n, 10000n, 100000n];

    console.log("💰 COST TO MINT DIFFERENT CLP AMOUNTS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const clpAmount of testAmounts) {
        const monNeeded = (amount0 * clpAmount) / liquidity;
        const keepNeeded = (amount1 * clpAmount) / liquidity;

        console.log(`\n   For ${clpAmount.toString()} CLP:`);
        console.log(`   MON: ${ethers.formatEther(monNeeded)}`);
        console.log(`   KEEP: ${ethers.formatEther(keepNeeded)}`);

        // Show as percentage of total
        const percentage = (clpAmount * 10000n) / totalLiquidity;
        console.log(`   (${Number(percentage) / 100}% of total supply)`);
    }

    console.log("\n\n⚠️  CRITICAL QUESTION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("If minting 802 CLP costs almost nothing, why does raiding cost 802 CLP?");
    console.log("Answer: Because CLP tokens represent TINY fractions of the position!");
    console.log("The position is HUGE (665 billion liquidity units), so each CLP is tiny.");
    console.log("But to raid, you need 802 CLP, which represents a real share of the pot.\n");

    console.log("💡 THE REAL ECONOMICS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. Minting CLP is cheap because liquidity units are huge numbers");
    console.log("2. But CLP tokens represent REAL ownership of the pool");
    console.log("3. To raid (get 772 MON pot), you need to burn 802 CLP");
    console.log("4. Those 802 CLP represent your share of the position");
    console.log("5. The 'cost' isn't the mint cost - it's the OPPORTUNITY COST of burning your share!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

