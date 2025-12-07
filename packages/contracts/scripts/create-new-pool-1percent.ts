import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_FACTORY = "0x204faca1764b154221e35c0d20abb3c525710498";
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
    console.log("🚀 CREATING NEW POOL WITH 1% FEES AND CORRECT PRICE (10 KEEP = 1 MON)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Sort tokens (token0 < token1)
    const token0 = KEEP.toLowerCase() < CORRECT_WMON.toLowerCase() ? KEEP : CORRECT_WMON;
    const token1 = KEEP.toLowerCase() < CORRECT_WMON.toLowerCase() ? CORRECT_WMON : KEEP;

    console.log(`Token0: ${token0} (${token0 === KEEP ? "KEEP" : "WMON"})`);
    console.log(`Token1: ${token1} (${token1 === KEEP ? "KEEP" : "WMON"})`);
    console.log(`Fee Tier: ${POOL_FEE} (1%)\n`);

    // Check if pool already exists
    const factory = new ethers.Contract(
        V3_FACTORY,
        ["function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"],
        deployer
    );

    const existingPool = await factory.getPool(token0, token1, POOL_FEE);
    console.log(`Pool Address: ${existingPool}\n`);

    // Calculate sqrtPriceX96 for 10 KEEP = 1 MON
    // Target: 1 MON = 10 KEEP
    let sqrtPriceX96: bigint;
    if (token0 === KEEP) {
        // KEEP is token0, WMON is token1
        // Price = token1/token0 = WMON/KEEP = MON/KEEP
        // We want: 1 MON = 10 KEEP, so MON/KEEP = 1/10 = 0.1
        // encodeSqrtRatioX96(amount1, amount0) = encodeSqrtRatioX96(1, 10) = 1 WMON per 10 KEEP
        console.log("Target Price: 0.1 WMON per 1 KEEP (1 MON = 10 KEEP)");
        sqrtPriceX96 = encodeSqrtRatioX96(1, 10); // 1 WMON per 10 KEEP
    } else {
        // WMON is token0, KEEP is token1
        // Price = token1/token0 = KEEP/WMON = KEEP/MON
        // We want: 1 MON = 10 KEEP, so KEEP/MON = 10
        console.log("Target Price: 10 KEEP per 1 WMON (1 MON = 10 KEEP)");
        sqrtPriceX96 = encodeSqrtRatioX96(10, 1); // 10 KEEP per 1 WMON
    }

    console.log(`SqrtPriceX96: ${sqrtPriceX96.toString()}\n`);

    // Initialize pool
    const positionManager = new ethers.Contract(
        V3_POSITION_MANAGER,
        [
            "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)"
        ],
        deployer
    );

    console.log("📝 Creating/initializing pool with correct price...");
    const tx = await positionManager.createAndInitializePoolIfNecessary(
        token0,
        token1,
        POOL_FEE,
        sqrtPriceX96
    );

    console.log(`Transaction hash: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Pool created/initialized!\n");

    // Verify pool state
    const poolABI = [
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function liquidity() external view returns (uint128)"
    ];
    const pool = new ethers.Contract(existingPool, poolABI, deployer);

    const [slot0, poolLiquidity] = await Promise.all([
        pool.slot0(),
        pool.liquidity()
    ]);

    console.log("📊 Pool State:");
    console.log(`   Pool Address: ${existingPool}`);
    console.log(`   SqrtPriceX96: ${slot0[0].toString()}`);
    console.log(`   Liquidity: ${poolLiquidity.toString()}\n`);

    // Calculate actual price
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(slot0[0]) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;

    let actualKeepPerMon: number;
    if (token0 === KEEP) {
        actualKeepPerMon = 1 / price;
    } else {
        actualKeepPerMon = price;
    }

    console.log(`💰 Pool Price: 1 MON = ${actualKeepPerMon.toFixed(6)} KEEP`);
    console.log(`🎯 Target Price: 1 MON = 10 KEEP\n`);

    if (Math.abs(actualKeepPerMon - 10) < 0.1) {
        console.log("✅ SUCCESS! Pool is initialized with correct price!");
        console.log(`\n⚠️  Update addresses.ts:`);
        console.log(`   V3_POOL: '${existingPool}' as Address,`);
    } else {
        console.log("⚠️  Pool price is not exactly at target. This may be due to the pool already being initialized.");
        console.log("   The pool address is: " + existingPool);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

