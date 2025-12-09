import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const V3_SWAP_ROUTER = "0xc3AFB12b3d39225F0500bD77ec0673A1953e1af0";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";

async function main() {
    console.log("💰 SELLING KEEP TO FIX POOL PRICE (NO SLIPPAGE PROTECTION)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}\n`);

    const keepToken = await ethers.getContractAt(
        ["function balanceOf(address) view returns (uint256)", "function approve(address, uint256) returns (bool)", "function allowance(address,address) view returns (uint256)"],
        KEEP,
        deployer
    );

    const userKEEPBalance = await keepToken.balanceOf(deployer.address);
    console.log(`Your KEEP Balance: ${ethers.formatEther(userKEEPBalance)} KEEP\n`);

    // Get pool state
    const poolABI = [
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick)"
    ];
    const pool = await ethers.getContractAt(poolABI, V3_POOL, deployer);

    const [token0, token1, slot0] = await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.slot0()
    ]);

    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();
    const Q96 = 2n ** 96n;

    // Get current price
    const getCurrentPrice = async () => {
        const slot = await pool.slot0();
        const sqrtPrice = Number(slot.sqrtPriceX96) / Number(Q96);
        const priceToken1PerToken0 = sqrtPrice * sqrtPrice;
        if (isToken0KEEP) {
            // token0 = KEEP, token1 = WMON
            // price = WMON per KEEP = MON per KEEP
            const monPerKeep = priceToken1PerToken0;
            return monPerKeep;
        } else {
            // token0 = WMON, token1 = KEEP
            // price = KEEP per WMON = KEEP per MON
            const keepPerMon = priceToken1PerToken0;
            const monPerKeep = 1 / keepPerMon;
            return monPerKeep;
        }
    };

    let currentMonPerKeep = await getCurrentPrice();

    console.log("📊 CURRENT STATE:");
    console.log(`  Current: 1 KEEP = ${currentMonPerKeep.toFixed(6)} MON\n`);

    // Approve router
    const routerAddress = V3_SWAP_ROUTER;
    const currentAllowance = await keepToken.allowance(deployer.address, routerAddress);
    const maxAmount = userKEEPBalance;

    if (currentAllowance < maxAmount) {
        console.log("📝 Approving router to spend KEEP...");
        const approveTx = await keepToken.approve(routerAddress, maxAmount);
        await approveTx.wait();
        console.log("  ✅ Approved\n");
    }

    const routerABI = [
        "function swapExactInput(address pool, uint256 amountIn, uint256 amountOutMinimum, address recipient, bool zeroForOne) external payable returns (uint256 amountOut)"
    ];
    const router = await ethers.getContractAt(routerABI, routerAddress, deployer);
    const zeroForOne = isToken0KEEP; // KEEP → WMON

    // Sell in chunks - start small to avoid pool rejection
    const chunkSize = ethers.parseEther("1"); // 1 KEEP per swap
    let totalSold = 0n;
    let keepBalance = userKEEPBalance;

    console.log(`🔄 Selling KEEP in chunks of ${ethers.formatEther(chunkSize)} KEEP...\n`);

    while (keepBalance >= chunkSize) {
        currentMonPerKeep = await getCurrentPrice();

        console.log(`Current: 1 KEEP = ${currentMonPerKeep.toFixed(6)} MON`);

        const amountToSell = chunkSize;

        console.log(`Selling ${ethers.formatEther(amountToSell)} KEEP...`);

        try {
            const swapTx = await router.swapExactInput(
                V3_POOL,
                amountToSell,
                0n, // NO slippage protection
                deployer.address,
                zeroForOne
            );

            console.log(`  Tx: ${swapTx.hash}`);
            const receipt = await swapTx.wait();
            console.log(`  ✅ Confirmed (gas: ${receipt.gasUsed.toString()})`);

            totalSold += amountToSell;
            keepBalance -= amountToSell;

            // Wait for state update
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get new price
            const newPrice = await getCurrentPrice();
            console.log(`  New: 1 KEEP = ${newPrice.toFixed(6)} MON\n`);

        } catch (error: any) {
            console.error(`  ❌ Failed: ${error.message}`);
            if (error.message.includes("SPL")) {
                console.log(`  Pool rejected swap - trying smaller chunk...`);
                // Try smaller chunk next time
                break;
            }
            console.log(`  Continuing...\n`);
        }
    }

    // Final state
    const finalPrice = await getCurrentPrice();

    console.log("\n📊 FINAL RESULTS:");
    console.log(`  Total KEEP Sold: ${ethers.formatEther(totalSold)} KEEP`);
    console.log(`  Final: 1 KEEP = ${finalPrice.toFixed(6)} MON`);
    console.log(`  Remaining KEEP: ${ethers.formatEther(keepBalance)} KEEP\n`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
