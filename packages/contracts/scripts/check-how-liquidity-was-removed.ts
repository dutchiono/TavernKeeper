import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";

const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
    'function ownerOf(uint256 tokenId) external view returns (address)',
];

// Event signatures
const DECREASE_LIQUIDITY_EVENT = "event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)";
const COLLECT_EVENT = "event Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)";

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 INVESTIGATING HOW LIQUIDITY WAS REMOVED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, POSITION_MANAGER_ABI, deployer);
    const cellar = new ethers.Contract(THE_CELLAR_V3, ['function tokenId() view returns (uint256)'], deployer);

    const tokenId = await cellar.tokenId();
    if (tokenId === 0n) {
        console.log("No position exists.");
        return;
    }

    const position = await positionManager.positions(tokenId);
    const positionOwner = await positionManager.ownerOf(tokenId);

    console.log("📍 POSITION OWNERSHIP:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Position NFT Owner: ${positionOwner}`);
    console.log(`   TheCellar Contract: ${THE_CELLAR_V3}`);
    console.log(`   Match: ${positionOwner.toLowerCase() === THE_CELLAR_V3.toLowerCase() ? "✅ YES" : "❌ NO"}`);
    console.log();

    if (positionOwner.toLowerCase() !== THE_CELLAR_V3.toLowerCase()) {
        console.log("   ⚠️  CRITICAL: Position is NOT owned by TheCellar!");
        console.log(`       Someone else owns the NFT and could remove liquidity directly!`);
        console.log();
    }

    console.log("🔍 CHECKING FOR DIRECT LIQUIDITY REMOVALS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 200000); // Last 200k blocks

    try {
        // Create contract with event filters
        const pmWithEvents = new ethers.Contract(V3_POSITION_MANAGER, [
            POSITION_MANAGER_ABI[0],
            DECREASE_LIQUIDITY_EVENT,
            COLLECT_EVENT,
        ], deployer);

        const decreaseEvents = await pmWithEvents.queryFilter(
            pmWithEvents.filters.DecreaseLiquidity(tokenId),
            fromBlock,
            currentBlock
        ).catch(() => []);

        console.log(`   Found ${decreaseEvents.length} DecreaseLiquidity events for this position\n`);

        let totalLiquidityDecreased = 0n;
        for (const event of decreaseEvents) {
            if (event.args && event.args.length >= 3) {
                const liquidity = BigInt(event.args[1].toString());
                totalLiquidityDecreased += liquidity;

                const block = await ethers.provider.getBlock(event.blockNumber);
                console.log(`   Block ${event.blockNumber} (${new Date(Number(block.timestamp) * 1000).toISOString()}):`);
                console.log(`     Liquidity Decreased: ${ethers.formatEther(liquidity)}`);
                console.log(`     Transaction: ${event.transactionHash}`);
                console.log();
            }
        }

        if (totalLiquidityDecreased > 0n) {
            console.log(`   Total Liquidity Decreased: ${ethers.formatEther(totalLiquidityDecreased)}`);
            console.log();
        }

    } catch (error: any) {
        console.log(`   ⚠️  Error querying events: ${error.message}`);
    }

    console.log("💡 HOW THIS COULD HAPPEN:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   If CLP Supply > Position Liquidity, possible causes:");
    console.log();
    console.log("   1. ✅ Emergency function called (emergencyRemoveAllLiquidity)");
    console.log("      → Removes liquidity WITHOUT burning CLP");
    console.log("      → Only owner can call");
    console.log();
    console.log("   2. ✅ Direct Position Manager call");
    console.log("      → If position NFT was transferred or operator set");
    console.log("      → Someone could call decreaseLiquidity() directly");
    console.log("      → This bypasses TheCellar contract entirely");
    console.log();
    console.log("   3. ✅ Contract upgrade bug");
    console.log("      → Earlier version might have had a bug");
    console.log("      → That allowed liquidity removal without CLP burn");
    console.log();
    console.log("   4. ✅ Fees collected reducing position value");
    console.log("      → Unlikely - collecting fees doesn't reduce liquidity");
    console.log("      → But could affect token amounts");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

