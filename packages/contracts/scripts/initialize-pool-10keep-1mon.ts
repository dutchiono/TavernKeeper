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
    console.log("🔧 INITIALIZING POOL WITH CORRECT PRICE (10 KEEP = 1 MON)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Sort tokens (token0 < token1)
    const token0 = KEEP.toLowerCase() < CORRECT_WMON.toLowerCase() ? KEEP : CORRECT_WMON;
    const token1 = KEEP.toLowerCase() < CORRECT_WMON.toLowerCase() ? CORRECT_WMON : KEEP;

    console.log(`Token0: ${token0} (${token0 === KEEP ? "KEEP" : "WMON"})`);
    console.log(`Token1: ${token1} (${token1 === KEEP ? "KEEP" : "WMON"})\n`);

    // Check if pool already exists
    const factory = new ethers.Contract(
        V3_FACTORY,
        ["function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"],
        deployer
    );

    const existingPool = await factory.getPool(token0, token1, POOL_FEE);
    if (existingPool && existingPool !== ethers.ZeroAddress) {
        console.log(`⚠️  Pool already exists at: ${existingPool}`);
        console.log(`   This script will initialize it with the new price if not already initialized.\n`);
    }

    // Calculate sqrtPriceX96 for 10 KEEP = 1 MON
    // Target: 1 MON = 10 KEEP
    let sqrtPriceX96: bigint;
    if (token0 === KEEP) {
        // KEEP is token0, WMON is token1
        // Price = token1/token0 = WMON/KEEP = MON/KEEP
        // We want: 1 MON = 10 KEEP, so MON/KEEP = 1/10 = 0.1
        // But price = token1/token0, so we need WMON/KEEP = 0.1
        // encodeSqrtRatioX96(amount1, amount0) = encodeSqrtRatioX96(0.1, 1) = encodeSqrtRatioX96(1, 10)
        console.log("Price: 0.1 WMON per 1 KEEP (1 MON = 10 KEEP)");
        sqrtPriceX96 = encodeSqrtRatioX96(1, 10); // 1 WMON per 10 KEEP
    } else {
        // WMON is token0, KEEP is token1
        // Price = token1/token0 = KEEP/WMON = KEEP/MON
        // We want: 1 MON = 10 KEEP, so KEEP/MON = 10
        console.log("Price: 10 KEEP per 1 WMON (1 MON = 10 KEEP)");
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

    console.log("📝 Creating/initializing pool...");
    const tx = await positionManager.createAndInitializePoolIfNecessary(
        token0,
        token1,
        POOL_FEE,
        sqrtPriceX96
    );

    console.log(`Transaction hash: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Pool created/initialized!");

    // Get the pool address
    const poolAddress = await factory.getPool(token0, token1, POOL_FEE);
    console.log(`\n✅ Pool Address: ${poolAddress}`);
    console.log(`\n⚠️  Update addresses.ts V3_POOL to: ${poolAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

