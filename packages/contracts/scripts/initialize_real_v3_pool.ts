
import { ethers } from "hardhat";

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

// Monad Mainnet Addresses - CORRECTED
const ADDRESSES = {
    WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A", // CORRECT WMON address
    KEEP: "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E", // Verified KEEP (has code)
    V3_POSITION_MANAGER: "0x7197e214c0b767cfb76fb734ab638e2c192f4e53"
};

const POOL_FEE = 10000; // 1%

// ABI
const PM_ABI = [
    "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)"
];

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Initializing REAL V3 Pool (Correct WMON)...`);
    console.log(`Deployer: ${deployer.address}`);

    // Sort Tokens
    const token0 = ADDRESSES.KEEP.toLowerCase() < ADDRESSES.WMON.toLowerCase() ? ADDRESSES.KEEP : ADDRESSES.WMON;
    const token1 = ADDRESSES.KEEP.toLowerCase() < ADDRESSES.WMON.toLowerCase() ? ADDRESSES.WMON : ADDRESSES.KEEP;

    console.log(`Token0: ${token0} (${token0 === ADDRESSES.KEEP ? "KEEP" : "WMON"})`);
    console.log(`Token1: ${token1} (${token1 === ADDRESSES.KEEP ? "KEEP" : "WMON"})`);

    // Price Target: 1 KEEP = 3 MON.
    let sqrtPriceX96;
    if (token0 === ADDRESSES.KEEP) {
        console.log("Configuration: KEEP is Token0. Price = 3 WMON / 1 KEEP.");
        sqrtPriceX96 = encodeSqrtRatioX96(3, 1);
    } else {
        console.log("Configuration: WMON is Token0. Price = 0.33 KEEP / 1 WMON.");
        sqrtPriceX96 = encodeSqrtRatioX96(1, 3);
    }

    const pm = new ethers.Contract(ADDRESSES.V3_POSITION_MANAGER, PM_ABI, deployer);

    const tx = await pm.createAndInitializePoolIfNecessary(
        token0,
        token1,
        POOL_FEE,
        sqrtPriceX96
    );

    console.log(`Transaction submitted: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Real Pool Initialized!`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
