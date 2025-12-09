import { ethers } from "hardhat";

// CORRECT ADDRESSES
const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_FACTORY = "0x204faca1764b154221e35c0d20abb3c525710498";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const THE_CELLAR_PROXY = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
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
    console.log("🔧 FIXING POOL AND CELLAR...\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MON\n`);

    // 1. Update TheCellarV3 to use correct WMON
    console.log("📝 Step 1: Updating TheCellarV3 config...");
    console.log(`Cellar Address: ${THE_CELLAR_PROXY}`);

    const TheCellarV3 = await ethers.getContractFactory("TheCellarV3");
    const cellar = TheCellarV3.attach(THE_CELLAR_PROXY);

    try {
        // Check current config
        const [currentWMON, currentKEEP] = await Promise.all([
            cellar.wmon(),
            cellar.keepToken()
        ]);

        console.log(`Current WMON: ${currentWMON}`);
        console.log(`Current KEEP: ${currentKEEP}`);
        console.log(`Correct WMON:  ${CORRECT_WMON}`);
        console.log(`Correct KEEP:  ${KEEP}\n`);

        if (currentWMON.toLowerCase() !== CORRECT_WMON.toLowerCase()) {
            console.log("⚠️  WMON address is WRONG! Updating...");
            const tx = await cellar.setConfig(CORRECT_WMON, KEEP);
            console.log(`Transaction: ${tx.hash}`);
            await tx.wait();
            console.log("✅ TheCellarV3 config updated!\n");

            // Verify
            const newWMON = await cellar.wmon();
            if (newWMON.toLowerCase() === CORRECT_WMON.toLowerCase()) {
                console.log("✅ Verified: WMON address updated correctly!\n");
            }
        } else {
            console.log("✅ TheCellarV3 already has correct WMON address!\n");
        }
    } catch (error: any) {
        console.error("❌ Failed to update TheCellarV3:", error.message);
        throw error;
    }

    // 2. Check if pool exists with correct tokens
    console.log("📝 Step 2: Checking for pool with correct WMON...");

    // Sort tokens (token0 < token1)
    const token0 = KEEP.toLowerCase() < CORRECT_WMON.toLowerCase() ? KEEP : CORRECT_WMON;
    const token1 = KEEP.toLowerCase() < CORRECT_WMON.toLowerCase() ? CORRECT_WMON : KEEP;

    console.log(`Token0: ${token0} (${token0 === KEEP ? "KEEP" : "WMON"})`);
    console.log(`Token1: ${token1} (${token1 === KEEP ? "KEEP" : "WMON"})`);

    const factory = new ethers.Contract(
        V3_FACTORY,
        ["function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"],
        deployer
    );

    const existingPool = await factory.getPool(token0, token1, POOL_FEE);

    if (existingPool && existingPool !== ethers.ZeroAddress) {
        console.log(`\n✅ Pool already exists with correct tokens!`);
        console.log(`Pool Address: ${existingPool}`);
        console.log(`\n⚠️  Update addresses.ts V3_POOL to: ${existingPool}`);
        return;
    }

    // 3. Create new pool with correct WMON
    console.log("\n📝 Step 3: Creating new pool with correct WMON...");

    // Calculate sqrtPriceX96 for 1 KEEP = 3 MON
    // If KEEP is token0 and WMON is token1: price = 3 WMON / 1 KEEP
    let sqrtPriceX96: bigint;
    if (token0 === KEEP) {
        console.log("Price: 3 WMON per 1 KEEP");
        sqrtPriceX96 = encodeSqrtRatioX96(3, 1);
    } else {
        console.log("Price: 0.333... KEEP per 1 WMON");
        sqrtPriceX96 = encodeSqrtRatioX96(1, 3);
    }

    console.log(`SqrtPriceX96: ${sqrtPriceX96.toString()}\n`);

    try {
        const positionManager = new ethers.Contract(
            V3_POSITION_MANAGER,
            [
                "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)"
            ],
            deployer
        );

        const tx = await positionManager.createAndInitializePoolIfNecessary(
            token0,
            token1,
            POOL_FEE,
            sqrtPriceX96
        );

        console.log(`Transaction: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Pool created!");

        // Get the pool address
        const poolAddress = await factory.getPool(token0, token1, POOL_FEE);

        console.log(`\n🎉 NEW POOL ADDRESS: ${poolAddress}`);
        console.log(`\n⚠️  UPDATE addresses.ts:`);
        console.log(`V3_POOL: '${poolAddress}' as Address,`);

    } catch (error: any) {
        console.error("❌ Failed to create pool:", error.message);
        throw error;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
