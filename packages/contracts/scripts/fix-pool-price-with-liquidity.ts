import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const POOL_FEE = 10000; // 1%

// Helper to calculate sqrtPriceX96 from price ratio
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
    console.log("🔧 FIXING POOL PRICE BY ADDING LIQUIDITY (10 KEEP = 1 MON)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Check current pool state
    const poolABI = [
        "function liquidity() external view returns (uint128)",
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)"
    ];

    const pool = new ethers.Contract(V3_POOL, poolABI, deployer);
    const [slot0, token0, token1, liquidity] = await Promise.all([
        pool.slot0(),
        pool.token0(),
        pool.token1(),
        pool.liquidity()
    ]);

    console.log("📊 Current Pool State:");
    console.log(`   Token0: ${token0} (${token0.toLowerCase() === CORRECT_WMON.toLowerCase() ? "WMON" : "KEEP"})`);
    console.log(`   Token1: ${token1} (${token1.toLowerCase() === CORRECT_WMON.toLowerCase() ? "WMON" : "KEEP"})`);
    console.log(`   Liquidity: ${liquidity.toString()}`);
    console.log(`   SqrtPriceX96: ${slot0[0].toString()}\n`);

    if (liquidity !== 0n) {
        console.log("⚠️  Pool still has liquidity! It should be empty first.");
        return;
    }

    const isToken0WMON = token0.toLowerCase() === CORRECT_WMON.toLowerCase();
    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();

    // Current price calculation
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(slot0[0]) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;

    let currentKeepPerMon: number;
    if (isToken0KEEP) {
        // KEEP is token0, WMON is token1
        // price = token1/token0 = WMON/KEEP = MON/KEEP
        // So KEEP/MON = 1/price
        currentKeepPerMon = 1 / price;
    } else {
        // WMON is token0, KEEP is token1
        // price = token1/token0 = KEEP/WMON = KEEP/MON
        currentKeepPerMon = price;
    }

    console.log(`💰 Current Price: 1 MON = ${currentKeepPerMon.toFixed(6)} KEEP`);
    console.log(`🎯 Target Price: 1 MON = 10 KEEP\n`);

    // Check token balances
    const erc20ABI = [
        "function balanceOf(address) external view returns (uint256)",
        "function approve(address, uint256) external returns (bool)"
    ];
    const wmon = new ethers.Contract(CORRECT_WMON, erc20ABI, deployer);
    const keep = new ethers.Contract(KEEP, erc20ABI, deployer);

    const wmonBalance = await wmon.balanceOf(deployer.address);
    const keepBalance = await keep.balanceOf(deployer.address);

    console.log(`💵 Your Balances:`);
    console.log(`   WMON: ${ethers.formatEther(wmonBalance)}`);
    console.log(`   KEEP: ${ethers.formatEther(keepBalance)}\n`);

    // To move price from 0.333 KEEP/MON to 10 KEEP/MON, we need to add much more KEEP
    // The price will move as we add liquidity at a different ratio
    // Let's add a reasonable amount at the target ratio
    const targetMON = ethers.parseEther("10"); // 10 MON to start
    const targetKEEP = ethers.parseEther("100"); // 100 KEEP (10 KEEP per MON)

    if (wmonBalance < targetMON || keepBalance < targetKEEP) {
        console.log("❌ Insufficient balance!");
        console.log(`   Need: ${ethers.formatEther(targetMON)} WMON, ${ethers.formatEther(targetKEEP)} KEEP`);
        console.log(`\n💡 You can adjust the amounts in the script if needed.`);
        return;
    }

    // Approve tokens to TheCellarV3
    console.log("📝 Approving tokens to TheCellarV3...");
    const approveWMON = await wmon.approve(THE_CELLAR_V3, targetMON);
    await approveWMON.wait();
    const approveKEEP = await keep.approve(THE_CELLAR_V3, targetKEEP);
    await approveKEEP.wait();
    console.log("✅ Tokens approved!\n");

    // Add liquidity via TheCellarV3
    console.log("➕ Adding liquidity at target ratio (10 KEEP = 1 MON)...");
    console.log(`   WMON: ${ethers.formatEther(targetMON)}`);
    console.log(`   KEEP: ${ethers.formatEther(targetKEEP)}`);
    console.log(`   Expected ratio: 1 MON = 10 KEEP\n`);

    const cellarABI = [
        "function addLiquidity(uint256 amountMonDesired, uint256 amountKeepDesired) external returns (uint256 liquidity)"
    ];
    const cellar = new ethers.Contract(THE_CELLAR_V3, cellarABI, deployer);

    try {
        const tx = await cellar.addLiquidity(targetMON, targetKEEP);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("✅ Liquidity added!\n");

        // Check new pool state
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for state to update

        const [newSlot0, newLiquidity] = await Promise.all([
            pool.slot0(),
            pool.liquidity()
        ]);

        console.log("📊 New Pool State:");
        console.log(`   Liquidity: ${newLiquidity.toString()}`);
        console.log(`   SqrtPriceX96: ${newSlot0[0].toString()}\n`);

        // Calculate new price
        const newSqrtPrice = Number(newSlot0[0]) / Number(Q96);
        const newPrice = newSqrtPrice * newSqrtPrice;

        let newKeepPerMon: number;
        if (isToken0KEEP) {
            newKeepPerMon = 1 / newPrice;
        } else {
            newKeepPerMon = newPrice;
        }

        console.log(`💰 New Price: 1 MON = ${newKeepPerMon.toFixed(6)} KEEP\n`);

        const priceDiff = Math.abs(newKeepPerMon - 10);
        const priceDiffPercent = (priceDiff / 10) * 100;

        if (priceDiffPercent < 10) {
            console.log(`✅ SUCCESS! Pool price is now close to target (within ${priceDiffPercent.toFixed(2)}%)!`);
            console.log(`   Target: 1 MON = 10 KEEP`);
            console.log(`   Actual: 1 MON = ${newKeepPerMon.toFixed(6)} KEEP`);
        } else {
            console.log(`⚠️  Price moved from ${currentKeepPerMon.toFixed(6)} to ${newKeepPerMon.toFixed(6)} KEEP/MON`);
            console.log(`   Still off by ${priceDiffPercent.toFixed(2)}% from target (10 KEEP/MON)`);
            console.log(`\n💡 You may need to add more liquidity or swap to move the price further.`);
        }
    } catch (error: any) {
        console.error("❌ Error adding liquidity:", error.message);
        if (error.message.includes("STF")) {
            console.log("\n💡 This might mean the price moved too much. Try adding liquidity in smaller increments.");
        }
        throw error;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
