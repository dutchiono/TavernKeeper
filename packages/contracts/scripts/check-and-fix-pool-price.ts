import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const POOL_FEE = 10000; // 1%

// Helper to calculate SqrtPriceX96
function encodeSqrtRatioX96(amount1: number, amount0: number): bigint {
    const numerator = BigInt(amount1);
    const denominator = BigInt(amount0);
    const ratio = (numerator << 192n) / denominator;
    return sqrt(ratio);
}

function sqrt(value: bigint): bigint {
    if (value < 0n) throw new Error("negative number");
    if (value < 2n) return value;
    let x = value;
    let y = (x + 1n) / 2n;
    while (y < x) {
        x = y;
        y = (value / x + x) / 2n;
    }
    return x;
}

async function main() {
    console.log("🔍 CHECKING POOL PRICE...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Get pool state
    const poolABI = [
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function liquidity() external view returns (uint128)"
    ];

    const pool = new ethers.Contract(V3_POOL, poolABI, deployer);

    const [slot0, token0, token1, liquidity] = await Promise.all([
        pool.slot0(),
        pool.token0(),
        pool.token1(),
        pool.liquidity()
    ]);

    const sqrtPriceX96 = slot0[0];
    const tick = slot0[1];

    console.log("📊 Current Pool State:");
    console.log(`  Token0: ${token0} (${token0.toLowerCase() === CORRECT_WMON.toLowerCase() ? "WMON" : token0.toLowerCase() === KEEP.toLowerCase() ? "KEEP" : "UNKNOWN"})`);
    console.log(`  Token1: ${token1} (${token1.toLowerCase() === CORRECT_WMON.toLowerCase() ? "WMON" : token1.toLowerCase() === KEEP.toLowerCase() ? "KEEP" : "UNKNOWN"})`);
    console.log(`  SqrtPriceX96: ${sqrtPriceX96.toString()}`);
    console.log(`  Tick: ${tick.toString()}`);
    console.log(`  Liquidity: ${liquidity.toString()}\n`);

    // Calculate current price
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice; // token1/token0

    const isToken0WMON = token0.toLowerCase() === CORRECT_WMON.toLowerCase();
    const isToken1WMON = token1.toLowerCase() === CORRECT_WMON.toLowerCase();
    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();
    const isToken1KEEP = token1.toLowerCase() === KEEP.toLowerCase();

    let currentKeepPerMon: number;
    if (isToken0WMON && isToken1KEEP) {
        // token0 = WMON, token1 = KEEP
        // price = token1/token0 = KEEP/WMON = KEEP/MON
        currentKeepPerMon = price;
    } else if (isToken0KEEP && isToken1WMON) {
        // token0 = KEEP, token1 = WMON
        // price = token1/token0 = WMON/KEEP = MON/KEEP
        // So KEEP/MON = 1/price
        currentKeepPerMon = 1 / price;
    } else {
        console.error("❌ Unexpected token order in pool");
        return;
    }

    console.log("💰 Current Price:");
    console.log(`  1 MON = ${currentKeepPerMon.toFixed(6)} KEEP`);
    console.log(`  1 KEEP = ${(1 / currentKeepPerMon).toFixed(6)} MON\n`);

    // Target price: 10 KEEP = 1 MON (1 MON = 10 KEEP)
    const targetKeepPerMon = 10;
    const priceDifference = Math.abs(currentKeepPerMon - targetKeepPerMon);
    const priceDifferencePercent = (priceDifference / targetKeepPerMon) * 100;

    console.log("🎯 Target Price:");
    console.log(`  1 MON = ${targetKeepPerMon} KEEP`);
    console.log(`  1 KEEP = ${(1 / targetKeepPerMon).toFixed(6)} MON\n`);

    if (priceDifferencePercent < 1) {
        console.log("✅ Pool price is correct (within 1% of target)!");
    } else {
        console.log(`⚠️  Pool price is off by ${priceDifferencePercent.toFixed(2)}%`);
        console.log(`\nTo fix the price, you need to:`);
        console.log(`1. Add liquidity at the target price (10 KEEP = 1 MON)`);
        console.log(`2. Or create a new pool with the correct initial price`);
        console.log(`\nNote: You cannot directly change a pool's price after initialization.`);
        console.log(`You must add/remove liquidity to move the price.`);
    }

    // Calculate target sqrtPriceX96 for reference
    const targetSqrtPriceX96 = isToken0WMON && isToken1KEEP
        ? encodeSqrtRatioX96(targetKeepPerMon, 1) // 10 KEEP per 1 MON
        : encodeSqrtRatioX96(1, targetKeepPerMon); // 1 MON per 10 KEEP = 0.1 MON per 1 KEEP

    console.log(`\n📐 Target SqrtPriceX96: ${targetSqrtPriceX96.toString()}`);
    console.log(`   Current SqrtPriceX96: ${sqrtPriceX96.toString()}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

