import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

// Target ratio: 10 KEEP = 1 MON
const TARGET_KEEP_PER_MON = 10;

async function main() {
    console.log("📊 ANALYZING CELLAR V3 POSITION & FIX OPTIONS...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // Get pool info
    const poolABI = [
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function liquidity() external view returns (uint128)",
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
    ];
    const pool = new ethers.Contract(V3_POOL, poolABI, deployer);

    const [token0, token1, poolLiquidity, slot0] = await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.liquidity(),
        pool.slot0()
    ]);

    console.log("🏊 POOL INFO:");
    console.log(`  Token0: ${token0}`);
    console.log(`  Token1: ${token1}`);
    console.log(`  Pool Liquidity: ${poolLiquidity.toString()}`);
    console.log(`  Current Tick: ${slot0.tick}`);
    console.log(`  SqrtPriceX96: ${slot0.sqrtPriceX96.toString()}\n`);

    // Determine token order
    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();
    const isToken1WMON = token1.toLowerCase() === WMON.toLowerCase();

    if (!isToken0KEEP || !isToken1WMON) {
        console.log("⚠️  Unexpected token order in pool!");
        console.log(`  Expected: Token0 = KEEP, Token1 = WMON`);
        console.log(`  Actual: Token0 = ${token0}, Token1 = ${token1}`);
        return;
    }

    // Calculate current price
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(slot0.sqrtPriceX96) / Number(Q96);
    const priceToken1PerToken0 = sqrtPrice * sqrtPrice; // WMON per KEEP
    const currentKeepPerMon = 1 / priceToken1PerToken0; // KEEP per MON

    console.log("💹 CURRENT PRICE:");
    console.log(`  Current: 1 KEEP = ${priceToken1PerToken0.toFixed(4)} MON (KEEP is OVERPRICED!)`);
    console.log(`  Current: 1 MON = ${currentKeepPerMon.toFixed(4)} KEEP`);
    console.log(`  Target: 1 MON = ${TARGET_KEEP_PER_MON} KEEP (or 1 KEEP = ${(1/TARGET_KEEP_PER_MON).toFixed(4)} MON)\n`);

    // Check if TheCellarV3 has a position
    const cellarABI = [
        "function tokenId() external view returns (uint256)",
        "function wmon() external view returns (address)",
        "function keepToken() external view returns (address)"
    ];
    const cellar = new ethers.Contract(THE_CELLAR_V3, cellarABI, deployer);
    const tokenId = await cellar.tokenId();

    if (tokenId === 0n) {
        console.log("✅ TheCellarV3 has no position yet - you can create one at the correct ratio!");
        return;
    }

    console.log(`📌 Position Token ID: ${tokenId.toString()}\n`);

    // Get position details
    const positionManagerABI = [
        "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
    ];
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, positionManagerABI, deployer);

    const position = await positionManager.positions(tokenId);

    console.log("📍 POSITION DETAILS:");
    console.log(`  Token0: ${position.token0}`);
    console.log(`  Token1: ${position.token1}`);
    console.log(`  Fee: ${position.fee} (${Number(position.fee) / 10000}%)`);
    console.log(`  Tick Lower: ${position.tickLower.toString()}`);
    console.log(`  Tick Upper: ${position.tickUpper.toString()}`);
    console.log(`  Current Liquidity: ${position.liquidity.toString()}`);
    console.log(`  Tokens Owed0: ${position.tokensOwed0.toString()}`);
    console.log(`  Tokens Owed1: ${position.tokensOwed1.toString()}\n`);

    // Calculate current position ratio
    // In Uniswap V3, when price is in range, both tokens are used
    // We need to estimate based on current price and liquidity
    const currentPriceX96 = slot0.sqrtPriceX96;

    // Estimate token amounts in position
    // This is approximate - actual depends on where price is in the range
    let estimatedToken0Amount: bigint;
    let estimatedToken1Amount: bigint;

    if (slot0.tick >= position.tickLower && slot0.tick < position.tickUpper) {
        // Price is in range - both tokens are active
        // Rough estimate: use liquidity and current price
        estimatedToken0Amount = (BigInt(position.liquidity) * Q96) / currentPriceX96;
        estimatedToken1Amount = (BigInt(position.liquidity) * currentPriceX96) / Q96;
    } else if (slot0.tick < position.tickLower) {
        // Price is below range - all token0
        estimatedToken0Amount = BigInt(position.liquidity) * 1000n; // Rough estimate
        estimatedToken1Amount = 0n;
    } else {
        // Price is above range - all token1
        estimatedToken0Amount = 0n;
        estimatedToken1Amount = BigInt(position.liquidity) * 1000n; // Rough estimate
    }

    const estimatedKEEP = isToken0KEEP ? estimatedToken0Amount : estimatedToken1Amount;
    const estimatedWMON = isToken1WMON ? estimatedToken1Amount : estimatedToken0Amount;
    const estimatedMON = estimatedWMON; // WMON = MON (wrapped)

    console.log("💰 ESTIMATED POSITION COMPOSITION:");
    console.log(`  KEEP: ${ethers.formatEther(estimatedKEEP)}`);
    console.log(`  MON (WMON): ${ethers.formatEther(estimatedMON)}`);
    if (estimatedMON > 0n) {
        const currentRatio = Number(estimatedKEEP) / Number(estimatedMON);
        console.log(`  Current Ratio: ${currentRatio.toFixed(4)} KEEP per 1 MON`);
        console.log(`  Target Ratio: ${TARGET_KEEP_PER_MON} KEEP per 1 MON`);
        const ratioDiff = ((currentRatio - TARGET_KEEP_PER_MON) / TARGET_KEEP_PER_MON) * 100;
        console.log(`  Difference: ${ratioDiff > 0 ? '+' : ''}${ratioDiff.toFixed(2)}%\n`);
    } else {
        console.log(`  ⚠️  Position is all KEEP (price is above range or estimate failed)\n`);
    }

    // Analyze fix options
    console.log("🔧 FIX OPTIONS:\n");

    const priceDiffPercent = ((currentKeepPerMon - TARGET_KEEP_PER_MON) / TARGET_KEEP_PER_MON) * 100;

    console.log("✅ OPTION 1: Remove Liquidity and Re-Add at Correct Ratio");
    console.log(`  - Remove all current liquidity from TheCellarV3`);
    console.log(`  - Get back tokens in current proportion`);
    console.log(`  - Re-add at target ratio: ${TARGET_KEEP_PER_MON} KEEP per 1 MON`);
    console.log(`  - Requires: Enough tokens at correct ratio to re-add\n`);

    console.log("✅ OPTION 2: Add More Liquidity in Opposite Ratio (Counter-Balance)");
    if (currentKeepPerMon < TARGET_KEEP_PER_MON) {
        console.log(`  - Current: ${currentKeepPerMon.toFixed(4)} KEEP per MON (KEEP is OVERPRICED)`);
        console.log(`  - Add more liquidity with HIGHER KEEP ratio to balance`);
        console.log(`  - This offsets the existing imbalance`);
    } else {
        console.log(`  - Current: ${currentKeepPerMon.toFixed(4)} KEEP per MON (KEEP is underpriced)`);
        console.log(`  - Add more liquidity with LOWER KEEP ratio (more MON)`);
        console.log(`  - This offsets the existing imbalance`);
    }
    console.log(`  - Net effect: Overall position gets closer to target ratio\n`);

    console.log("✅ OPTION 3: Wait for Price to Move (if applicable)");
    if (slot0.tick < position.tickLower || slot0.tick >= position.tickUpper) {
        console.log(`  - ⚠️  Price is OUT OF RANGE!`);
        console.log(`  - Current tick: ${slot0.tick}`);
        console.log(`  - Range: ${position.tickLower} to ${position.tickUpper}`);
        console.log(`  - Wait for price to move back into range`);
        console.log(`  - This will rebalance the position automatically`);
    } else {
        console.log(`  - Price is in range (tick ${slot0.tick})`);
        console.log(`  - Waiting won't help - swaps will move price but won't fix ratio\n`);
    }

    // Calculate what swap would be needed to move price
    console.log("💡 OPTION 4: Move Price via Large Swap");
    console.log(`  - Current: 1 MON = ${currentKeepPerMon.toFixed(4)} KEEP (1 KEEP = ${priceToken1PerToken0.toFixed(4)} MON)`);
    console.log(`  - Target: 1 MON = ${TARGET_KEEP_PER_MON} KEEP (1 KEEP = ${(1/TARGET_KEEP_PER_MON).toFixed(4)} MON)`);
    console.log(`  - Price difference: ${Math.abs(priceDiffPercent).toFixed(2)}%`);
    console.log(`  - KEEP is OVERPRICED right now!`);

    if (currentKeepPerMon < TARGET_KEEP_PER_MON) {
        console.log(`  - ✅ To fix: SELL KEEP into pool (trade KEEP → MON)`);
        console.log(`  - This will increase KEEP supply, decrease MON supply`);
        console.log(`  - This makes KEEP CHEAPER (moves toward target)`);
        console.log(`  - ⚠️  WARNING: Would require MASSIVE KEEP amount due to ${Math.abs(priceDiffPercent).toFixed(2)}% gap!`);
        console.log(`  - ⚠️  Would cause extreme slippage and price impact!`);
    } else {
        console.log(`  - To reach target: Need to BUY KEEP (raise the KEEP price)`);
        console.log(`  - ⚠️  WARNING: This would require massive MON and cause slippage!`);
    }
    console.log(`  - NOT RECOMMENDED for fixing position ratio (use Option 1 instead)\n`);

    // Recommendations
    console.log("🎯 RECOMMENDATIONS:\n");

    if (position.liquidity === 0n) {
        console.log("  ✅ Position has no liquidity - you can add fresh liquidity at correct ratio!");
    } else if (Math.abs(priceDiffPercent) < 5) {
        console.log(`  ✅ Price is close to target (${Math.abs(priceDiffPercent).toFixed(2)}% off)`);
        console.log(`     - Option 2 (counter-balance) might work with minimal extra liquidity`);
        console.log(`     - Or Option 1 (remove/re-add) for clean reset`);
    } else {
        console.log(`  ⚠️  Price is ${Math.abs(priceDiffPercent).toFixed(2)}% off target`);
        console.log(`     - Best: Option 1 (remove and re-add at correct ratio)`);
        console.log(`     - This ensures clean position with exact ratio you want`);
    }

    console.log("\n📝 Next Steps:");
    console.log("  1. Review the position details above");
    console.log("  2. Choose your preferred fix option");
    console.log("  3. Use appropriate script to execute the fix");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

