import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

// Target: 1 KEEP = 0.1 MON (or 1 MON = 10 KEEP)
const TARGET_MON_PER_KEEP = 0.1;
const POOL_FEE = 10000; // 1% in basis points

async function main() {
    console.log("🔢 CALCULATING EXACT KEEP AMOUNT NEEDED TO REACH TARGET PRICE...\n");

    const [deployer] = await ethers.getSigners();

    // Get current pool state
    const poolABI = [
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function liquidity() external view returns (uint128)",
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function fee() external view returns (uint24)"
    ];
    const pool = new ethers.Contract(V3_POOL, poolABI, deployer);

    const [token0, token1, poolLiquidity, slot0, poolFee] = await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.liquidity(),
        pool.slot0(),
        pool.fee()
    ]);

    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();
    const Q96 = 2n ** 96n;

    // Current price calculation
    const currentSqrtPriceX96 = slot0.sqrtPriceX96;
    const sqrtPrice = Number(currentSqrtPriceX96) / Number(Q96);
    const priceToken1PerToken0 = sqrtPrice * sqrtPrice;

    // Current: WMON per KEEP (if token0=KEEP) or KEEP per WMON (if token1=KEEP)
    const currentMonPerKeep = isToken0KEEP ? priceToken1PerToken0 : (1 / priceToken1PerToken0);

    console.log("📊 CURRENT POOL STATE:");
    console.log(`  Current Price: 1 KEEP = ${currentMonPerKeep.toFixed(6)} MON`);
    console.log(`  Target Price: 1 KEEP = ${TARGET_MON_PER_KEEP} MON`);
    console.log(`  Pool Liquidity: ${poolLiquidity.toString()}`);
    console.log(`  Pool Fee: ${Number(poolFee) / 10000}%`);
    console.log(`  Current Tick: ${slot0.tick}\n`);

    // Target sqrtPriceX96
    const targetPrice = TARGET_MON_PER_KEEP;
    const targetSqrtPrice = Math.sqrt(isToken0KEEP ? targetPrice : (1 / targetPrice));
    const targetSqrtPriceX96 = BigInt(Math.floor(targetSqrtPrice * Number(Q96)));

    console.log(`  Target SqrtPriceX96: ${targetSqrtPriceX96.toString()}\n`);

    // Calculate reserves more accurately
    // For Uniswap V3, we need to account for concentrated liquidity
    // But for estimation, we can use the liquidity and current price

    // Estimate current reserves (simplified - assumes all liquidity at current price)
    const reserveKEEP = isToken0KEEP
        ? (poolLiquidity * Q96) / currentSqrtPriceX96
        : (poolLiquidity * currentSqrtPriceX96) / Q96;

    const reserveMON = isToken0KEEP
        ? (poolLiquidity * currentSqrtPriceX96) / Q96
        : (poolLiquidity * Q96) / currentSqrtPriceX96;

    console.log("💰 ESTIMATED CURRENT RESERVES:");
    console.log(`  KEEP: ${ethers.formatEther(reserveKEEP)}`);
    console.log(`  MON: ${ethers.formatEther(reserveMON)}\n`);

    // Calculate required amount using iterative approach
    // We need to solve: after selling X KEEP, new price = target

    console.log("🧮 CALCULATING EXACT AMOUNT...\n");

    // For a more accurate calculation, we need to account for:
    // 1. The constant product formula with fee
    // 2. How much MON we get out
    // 3. The new price after the swap

    // Simplified approach: use constant product with fee
    // k = reserveKEEP * reserveMON
    // After swap: (reserveKEEP + amountIn) * (reserveMON - amountOut) = k
    // With fee: amountOut = (amountIn * 99 * reserveMON) / (100 * reserveKEEP + 99 * amountIn)

    // Target price after swap: targetMonPerKeep = newReserveMON / newReserveKEEP
    // newReserveMON = reserveMON - amountOut
    // newReserveKEEP = reserveKEEP + amountIn

    // We need to solve for amountIn such that:
    // (reserveMON - amountOut) / (reserveKEEP + amountIn) = targetMonPerKeep

    // Using binary search or iterative method
    let low = 0n;
    let high = reserveKEEP * 100n; // Search up to 100x current reserves
    let bestAmount = 0n;
    let iterations = 0;
    const precision = ethers.parseEther("0.01"); // 0.01 KEEP precision

    console.log("  Searching for exact amount...");

    while (high - low > precision && iterations < 100) {
        iterations++;
        const mid = (low + high) / 2n;

        // Calculate new reserves after selling mid amount
        const amountIn = mid;
        const amountInAfterFee = (amountIn * BigInt(10000 - POOL_FEE)) / 10000n;
        const amountOutMON = (amountInAfterFee * reserveMON) / (reserveKEEP + amountInAfterFee);

        const newReserveKEEP = reserveKEEP + amountIn;
        const newReserveMON = reserveMON - amountOutMON;

        if (newReserveMON <= 0n || newReserveKEEP <= 0n) {
            high = mid;
            continue;
        }

        const newPrice = Number(newReserveMON) / Number(newReserveKEEP);

        if (newPrice <= TARGET_MON_PER_KEEP) {
            // We've overshot or hit target
            bestAmount = mid;
            high = mid;
        } else {
            // Still need more
            low = mid;
        }
    }

    const exactAmount = bestAmount || low;

    // Calculate final state with this amount
    const amountInAfterFee = (exactAmount * BigInt(10000 - POOL_FEE)) / 10000n;
    const amountOutMON = (amountInAfterFee * reserveMON) / (reserveKEEP + amountInAfterFee);
    const newReserveKEEP = reserveKEEP + exactAmount;
    const newReserveMON = reserveMON - amountOutMON;
    const finalPrice = Number(newReserveMON) / Number(newReserveKEEP);

    console.log(`\n✅ EXACT CALCULATION RESULTS:\n`);
    console.log(`  Amount of KEEP to Sell: ${ethers.formatEther(exactAmount)} KEEP`);
    console.log(`  MON You'll Receive: ${ethers.formatEther(amountOutMON)} MON`);
    console.log(`  Final Price After Swap: 1 KEEP = ${finalPrice.toFixed(6)} MON`);
    console.log(`  Target Price: 1 KEEP = ${TARGET_MON_PER_KEEP} MON`);
    console.log(`  Price Error: ${((finalPrice - TARGET_MON_PER_KEEP) / TARGET_MON_PER_KEEP * 100).toFixed(2)}%\n`);

    // Calculate price impact
    const priceImpact = ((currentMonPerKeep - finalPrice) / currentMonPerKeep) * 100;
    console.log(`  Price Impact: ${priceImpact.toFixed(2)}%`);
    console.log(`  Slippage: ~${(priceImpact / 2).toFixed(2)}% (estimated)\n`);

    console.log("⚠️  CRITICAL WARNINGS:\n");
    console.log(`  - This calculation uses SIMPLIFIED constant product formula`);
    console.log(`  - Uniswap V3 uses CONCENTRATED LIQUIDITY (not constant product)`);
    console.log(`  - Actual amount needed may be 2-5x different due to liquidity distribution`);
    console.log(`  - With ${poolLiquidity.toString()} liquidity, this swap would have EXTREME slippage`);
    console.log(`  - You'd need ${ethers.formatEther(exactAmount)} KEEP (${(Number(exactAmount) / Number(reserveKEEP)).toFixed(1)}x current reserves)`);
    console.log(`  - This is NOT RECOMMENDED - use Option 1 (remove/re-add liquidity) instead!\n`);

    // Show what this means in practical terms
    console.log("💡 WHAT THIS MEANS:\n");
    const userKEEPBalance = await ethers.getContractAt(
        ["function balanceOf(address) view returns (uint256)"],
        KEEP,
        deployer
    ).then(c => c.balanceOf(deployer.address)).catch(() => 0n);

    console.log(`  Your KEEP Balance: ${ethers.formatEther(userKEEPBalance)} KEEP`);
    console.log(`  Amount Needed: ${ethers.formatEther(exactAmount)} KEEP`);

    if (userKEEPBalance >= exactAmount) {
        console.log(`  ✅ You have enough KEEP!`);
    } else {
        const shortage = exactAmount - userKEEPBalance;
        console.log(`  ❌ You're short by: ${ethers.formatEther(shortage)} KEEP`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

