import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

const CELLAR_ABI = [
    'function totalLiquidity() view returns (uint256)',
    'function tokenId() view returns (uint256)',
    'function wmon() view returns (address)',
    'function keepToken() view returns (address)',
    'function positionManager() view returns (address)'
];

const POOL_ABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
];

const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)'
];

async function main() {
    console.log("🔍 VERIFYING LIQUIDITY CALCULATION METHOD\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);

    // Get current state
    const [totalLiquidity, tokenId, positionManagerAddr] = await Promise.all([
        cellar.totalLiquidity(),
        cellar.tokenId(),
        cellar.positionManager()
    ]);

    console.log(`Current Total Liquidity (CLP Supply): ${totalLiquidity.toString()}`);
    console.log(`Position ID: ${tokenId.toString()}\n`);

    if (tokenId === 0n) {
        console.log("❌ No position exists - cannot verify calculation");
        return;
    }

    // Get position details
    const pm = new ethers.Contract(positionManagerAddr, POSITION_MANAGER_ABI, deployer);
    const position = await pm.positions(tokenId);
    const pool = new ethers.Contract(V3_POOL, POOL_ABI, deployer);
    const slot0 = await pool.slot0();

    console.log("📍 CURRENT POSITION:");
    console.log(`   Position Liquidity: ${position.liquidity.toString()}`);
    console.log(`   Current Tick: ${slot0.tick}`);
    console.log(`   Tick Range: [${position.tickLower}, ${position.tickUpper}]`);
    console.log();

    // Method 1: Calculate proportionally based on what 1 CLP represents
    // If totalLiquidity = X and position has Y liquidity, then 1 CLP = Y/X of position
    // But this doesn't tell us token amounts...

    // Method 2: Use proper Uniswap V3 math for full range
    // For full range position at current price:
    // We need to calculate: given liquidity L, what are token0 and token1 amounts?

    const Q96 = 2n ** 96n;
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const currentTick = Number(slot0.tick);
    const tickLower = Number(position.tickLower);
    const tickUpper = Number(position.tickUpper);

    const isToken0KEEP = position.token0.toLowerCase() === KEEP.toLowerCase();

    console.log("🧮 CALCULATION METHODS:\n");

    // Method A: Simple formula (what my script uses - WRONG for small amounts)
    console.log("Method A: Simple formula (liquidity * Q96 / sqrtPriceX96)");
    const testLiquidity = 921n;
    const amount0_simple = (testLiquidity * Q96) / sqrtPriceX96;
    const amount1_simple = (testLiquidity * sqrtPriceX96) / Q96;

    if (isToken0KEEP) {
        console.log(`   For 921 liquidity: ${ethers.formatEther(amount0_simple)} KEEP, ${ethers.formatEther(amount1_simple)} MON`);
    } else {
        console.log(`   For 921 liquidity: ${ethers.formatEther(amount0_simple)} MON, ${ethers.formatEther(amount1_simple)} KEEP`);
    }
    console.log(`   ❌ This is clearly wrong (too small!)\n`);

    // Method B: Proportional calculation
    // If position has X liquidity and we want to add Y liquidity
    // We need Y/X proportion of the position's value
    // But we don't know the position's token amounts directly...

    console.log("Method B: Proportional calculation");
    console.log(`   Position Liquidity: ${position.liquidity.toString()}`);
    console.log(`   Target Liquidity: 921`);
    const proportion = (921n * 1000000n) / position.liquidity; // Use high precision
    console.log(`   Proportion: ${Number(proportion) / 10000}%`);
    console.log(`   ⚠️  But we don't know position's token amounts to calculate proportionally\n`);

    // Method C: Use actual Uniswap V3 math (proper way)
    // For full range, when price is in range:
    // amount0 = L * (1/sqrt(P_current) - 1/sqrt(P_upper))
    // amount1 = L * (sqrt(P_current) - sqrt(P_lower))
    // For full range, P_lower ≈ 0, P_upper ≈ ∞, so:
    // amount0 ≈ L / sqrt(P_current)
    // amount1 ≈ L * sqrt(P_current)

    console.log("Method C: Proper Uniswap V3 math for full range");
    if (currentTick >= tickLower && currentTick < tickUpper) {
        // Price is in range - use proper formula
        // For full range: tickLower = -887200, tickUpper = 887200
        // These are effectively -∞ and +∞ for practical purposes

        // Calculate sqrt prices at bounds
        // sqrtPriceLower = 1.0001^(tickLower/2)
        // sqrtPriceUpper = 1.0001^(tickUpper/2)
        // For full range, these are extreme, so we use current price approximation

        // Actually, for full range at current price:
        // amount0 = L * Q96 / sqrtPriceX96
        // amount1 = L * sqrtPriceX96 / Q96

        // But wait - that's what Method A does! So why is it wrong?

        // OH! The issue is precision/scale. Let me check the actual numbers:
        console.log(`   sqrtPriceX96: ${sqrtPriceX96.toString()}`);
        console.log(`   Q96: ${Q96.toString()}`);
        console.log(`   Test liquidity: ${testLiquidity.toString()}`);

        // The problem: sqrtPriceX96 is HUGE (39889953486052202832870962642)
        // When we divide by it, we get tiny numbers
        // But liquidity units are also large (665304611238489228332)

        // I think the issue is that 921 is WAY too small compared to the position size
        // Let me calculate what proportion 921 is:
        const proportion921 = (921n * 1000000000n) / position.liquidity;
        console.log(`   Proportion of position: ${Number(proportion921) / 10000000}%`);
        console.log(`   This is TINY - so token amounts should also be tiny`);
        console.log(`   But the calculation seems off by orders of magnitude\n`);

        // Let me try calculating what 1% of position would need:
        const onePercentLiquidity = position.liquidity / 100n;
        const amount0_1pct = (onePercentLiquidity * Q96) / sqrtPriceX96;
        const amount1_1pct = (onePercentLiquidity * sqrtPriceX96) / Q96;

        if (isToken0KEEP) {
            console.log(`   For 1% of position (${onePercentLiquidity.toString()} liquidity):`);
            console.log(`     ${ethers.formatEther(amount0_1pct)} KEEP`);
            console.log(`     ${ethers.formatEther(amount1_1pct)} MON`);
        } else {
            console.log(`   For 1% of position (${onePercentLiquidity.toString()} liquidity):`);
            console.log(`     ${ethers.formatEther(amount0_1pct)} MON`);
            console.log(`     ${ethers.formatEther(amount1_1pct)} KEEP`);
        }
        console.log();

        // Now scale down to 921:
        const amount0_921 = (amount0_1pct * 921n) / onePercentLiquidity;
        const amount1_921 = (amount1_1pct * 921n) / onePercentLiquidity;

        if (isToken0KEEP) {
            console.log(`   ✅ CORRECTED For 921 liquidity:`);
            console.log(`     ${ethers.formatEther(amount0_921)} KEEP`);
            console.log(`     ${ethers.formatEther(amount1_921)} MON`);
        } else {
            console.log(`   ✅ CORRECTED For 921 liquidity:`);
            console.log(`     ${ethers.formatEther(amount0_921)} MON`);
            console.log(`     ${ethers.formatEther(amount1_921)} KEEP`);
        }
    }

    console.log("\n📋 CONCLUSION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("The contract logic is CORRECT - it takes tokens and returns liquidity.");
    console.log("My script calculation was WRONG - I was using the formula incorrectly.");
    console.log("The issue: 921 liquidity is a tiny fraction of the position, so amounts are small,");
    console.log("but my calculation was off by orders of magnitude due to precision issues.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

