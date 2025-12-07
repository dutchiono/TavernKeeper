import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const V3_SWAP_ROUTER = "0x8DF71133E100c05486B5fbE60a1c82272fb8098b";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";

async function main() {
    console.log("💰 SELLING KEEP TO FIX POOL PRICE (NO SLIPPAGE PROTECTION)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Account: ${deployer.address}\n`);

    // Amount to sell (calculated earlier: ~503.71 KEEP)
    const AMOUNT_TO_SELL = ethers.parseEther("503.71");

    // Get balances
    const keepToken = await ethers.getContractAt(
        ["function balanceOf(address) view returns (uint256)", "function approve(address, uint256) returns (bool)", "function allowance(address,address) view returns (uint256)"],
        KEEP,
        deployer
    );

    const userKEEPBalance = await keepToken.balanceOf(deployer.address);
    console.log(`Your KEEP Balance: ${ethers.formatEther(userKEEPBalance)} KEEP`);
    console.log(`Amount to Sell: ${ethers.formatEther(AMOUNT_TO_SELL)} KEEP\n`);

    if (userKEEPBalance < AMOUNT_TO_SELL) {
        console.log(`❌ INSUFFICIENT BALANCE! Need ${ethers.formatEther(AMOUNT_TO_SELL)} KEEP`);
        return;
    }

    // Get pool state
    const poolABI = [
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
    ];
    const pool = await ethers.getContractAt(poolABI, V3_POOL, deployer);

    const [token0, token1, slot0Before] = await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.slot0()
    ]);

    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();
    const Q96 = 2n ** 96n;

    // Current price
    const sqrtPriceBefore = Number(slot0Before.sqrtPriceX96) / Number(Q96);
    const priceBefore = (sqrtPriceBefore * sqrtPriceBefore);
    const priceBeforeMonPerKeep = isToken0KEEP ? priceBefore : (1 / priceBefore);

    console.log("📊 BEFORE SWAP:");
    console.log(`  Price: 1 KEEP = ${priceBeforeMonPerKeep.toFixed(6)} MON\n`);

    // Approve router
    const currentAllowance = await keepToken.allowance(deployer.address, V3_SWAP_ROUTER);
    if (currentAllowance < AMOUNT_TO_SELL) {
        console.log("📝 Approving router...");
        const approveTx = await keepToken.approve(V3_SWAP_ROUTER, AMOUNT_TO_SELL);
        await approveTx.wait();
        console.log("✅ Approved\n");
    }

    // Get router
    const routerABI = [
        "function swapExactInput(address pool, uint256 amountIn, uint256 amountOutMinimum, address recipient, bool zeroForOne) external payable returns (uint256 amountOut)"
    ];
    const router = await ethers.getContractAt(routerABI, V3_SWAP_ROUTER, deployer);

    // KEEP → MON: zeroForOne = true (token0 → token1)
    const zeroForOne = isToken0KEEP;
    const amountOutMinimum = 0n; // NO SLIPPAGE PROTECTION

    console.log("🔄 EXECUTING SWAP:");
    console.log(`  Selling: ${ethers.formatEther(AMOUNT_TO_SELL)} KEEP`);
    console.log(`  Direction: KEEP → MON (zeroForOne: ${zeroForOne})`);
    console.log(`  Min Out: 0 (NO SLIPPAGE PROTECTION)\n`);

    try {
        const swapTx = await router.swapExactInput(
            V3_POOL,
            AMOUNT_TO_SELL,
            amountOutMinimum,
            deployer.address,
            zeroForOne
        );

        console.log(`  Transaction: ${swapTx.hash}`);
        console.log("  Waiting for confirmation...");
        const receipt = await swapTx.wait();
        console.log(`  ✅ Swap confirmed! Gas: ${receipt.gasUsed.toString()}\n`);

        // Check new price
        const slot0After = await pool.slot0();
        const sqrtPriceAfter = Number(slot0After.sqrtPriceX96) / Number(Q96);
        const priceAfter = (sqrtPriceAfter * sqrtPriceAfter);
        const priceAfterMonPerKeep = isToken0KEEP ? priceAfter : (1 / priceAfter);

        console.log("📊 AFTER SWAP:");
        console.log(`  Price: 1 KEEP = ${priceAfterMonPerKeep.toFixed(6)} MON`);
        console.log(`  Target: 1 KEEP = 0.1 MON\n`);

        const priceChange = priceBeforeMonPerKeep - priceAfterMonPerKeep;
        console.log(`  Price moved: ${priceChange.toFixed(6)} MON/KEEP`);
        console.log(`  Progress to target: ${((priceChange / (priceBeforeMonPerKeep - 0.1)) * 100).toFixed(2)}%\n`);

    } catch (error: any) {
        console.error("❌ SWAP FAILED:");
        console.error(`  Error: ${error.message}`);
        if (error.reason) {
            console.error(`  Reason: ${error.reason}`);
        }
        console.error("\n⚠️  The router contract may have internal slippage checks that are failing.");
        console.error("   Try breaking into smaller chunks or check the router contract.\n");
        throw error;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

