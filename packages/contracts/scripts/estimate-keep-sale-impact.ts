import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

// Target: 1 MON = 10 KEEP (or 1 KEEP = 0.1 MON)
const TARGET_MON_PER_KEEP = 0.1;

async function main() {
    console.log("🔮 ESTIMATING KEEP SALE IMPACT ON POOL PRICE...\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // Get current pool state
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

    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();
    const Q96 = 2n ** 96n;

    // Current price
    const sqrtPrice = Number(slot0.sqrtPriceX96) / Number(Q96);
    const priceToken1PerToken0 = sqrtPrice * sqrtPrice; // WMON per KEEP if token0=KEEP
    const currentMonPerKeep = isToken0KEEP ? priceToken1PerToken0 : (1 / priceToken1PerToken0);

    console.log("💹 CURRENT STATE:");
    console.log(`  Current: 1 KEEP = ${currentMonPerKeep.toFixed(4)} MON`);
    console.log(`  Target: 1 KEEP = ${TARGET_MON_PER_KEEP} MON`);
    console.log(`  Pool Liquidity: ${poolLiquidity.toString()}\n`);

    // Estimate reserves using liquidity
    // This is simplified - actual reserves depend on tick ranges
    const reserveKEEP = isToken0KEEP
        ? (poolLiquidity * Q96) / slot0.sqrtPriceX96
        : (poolLiquidity * slot0.sqrtPriceX96) / Q96;
    const reserveMON = isToken0KEEP
        ? (poolLiquidity * slot0.sqrtPriceX96) / Q96
        : (poolLiquidity * Q96) / slot0.sqrtPriceX96;

    console.log("💰 ESTIMATED POOL RESERVES:");
    console.log(`  KEEP: ${ethers.formatEther(reserveKEEP)}`);
    console.log(`  MON: ${ethers.formatEther(reserveMON)}\n`);

    // Calculate what's needed using constant product formula
    // After swap: (reserveKEEP + amountIn) * (reserveMON - amountOut) = k
    // Target price: amountOut / amountIn = TARGET_MON_PER_KEEP
    // With 1% fee: amountOut = (amountInAfterFee * reserveMON) / (reserveKEEP + amountInAfterFee)
    // amountInAfterFee = amountIn * 0.99

    const fee = 0.01; // 1%
    const feeMultiplier = 99n;
    const feeDivisor = 100n;

    console.log("🧮 CALCULATING REQUIRED KEEP SALE:\n");

    // Try different amounts and see resulting price
    const testAmounts = [
        ethers.parseEther("100"),
        ethers.parseEther("500"),
        ethers.parseEther("1000"),
        ethers.parseEther("5000"),
        ethers.parseEther("10000"),
        ethers.parseEther("25000"),
        ethers.parseEther("50000"),
    ];

    console.log("Amount KEEP Sold → Resulting Price (MON per KEEP) → Progress to Target\n");

    for (const amountKEEP of testAmounts) {
        // Constant product with fee
        const amountInAfterFee = (amountKEEP * feeMultiplier) / feeDivisor;
        const newReserveKEEP = reserveKEEP + amountKEEP;
        const amountOutMON = (amountInAfterFee * reserveMON) / (reserveKEEP + amountInAfterFee);
        const newReserveMON = reserveMON - amountOutMON;

        // New price = reserveMON / reserveKEEP
        const newPrice = Number(newReserveMON) / Number(newReserveKEEP);

        // Progress toward target (0 = current, 1 = target)
        const priceDiff = currentMonPerKeep - TARGET_MON_PER_KEEP;
        const newPriceDiff = newPrice - TARGET_MON_PER_KEEP;
        const progress = priceDiff !== 0 ? ((currentMonPerKeep - newPrice) / priceDiff) * 100 : 0;

        const progressBar = progress > 0 ? "█".repeat(Math.min(50, Math.floor(progress / 2))) : "";

        console.log(`  ${ethers.formatEther(amountKEEP).padStart(8)} KEEP → ${newPrice.toFixed(4)} MON/KEEP (${progress.toFixed(1)}% to target) ${progressBar}`);
    }

    console.log(`\n  Target: ${TARGET_MON_PER_KEEP} MON/KEEP\n`);

    // Calculate exact amount needed (approximate)
    console.log("⚠️  IMPORTANT NOTES:");
    console.log(`  - These are SIMPLIFIED estimates using constant product formula`);
    console.log(`  - Uniswap V3 uses concentrated liquidity (not constant product)`);
    console.log(`  - Actual results will vary based on tick ranges and liquidity distribution`);
    console.log(`  - Slippage and price impact will be EXTREME for large amounts`);
    console.log(`  - With 96.79% gap, you'd need ~30x+ more KEEP than MON in pool`);
    console.log(`  - RECOMMENDATION: Use Option 1 (remove/re-add liquidity) instead!\n`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

