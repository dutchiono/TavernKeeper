import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const POOL_ADDRESS = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const ROUTER_ADDRESS = "0x8DF71133E100c05486B5fbE60a1c82272fb8098b";
const WMON_ADDRESS = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP_ADDRESS = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

async function main() {
    console.log("🔍 TESTING SWAP ROUTER...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Testing with account: ${deployer.address}\n`);

    const router = await ethers.getContractAt("SimpleSwapRouter", ROUTER_ADDRESS);
    const pool = await ethers.getContractAt([
        "function token0() view returns (address)",
        "function token1() view returns (address)",
        "function liquidity() view returns (uint128)",
        "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
    ], POOL_ADDRESS);

    // Get pool info
    const token0 = await pool.token0();
    const token1 = await pool.token1();
    const liquidity = await pool.liquidity();
    const slot0 = await pool.slot0();

    console.log("📊 Pool Info:");
    console.log(`  Token0: ${token0}`);
    console.log(`  Token1: ${token1}`);
    console.log(`  Liquidity: ${liquidity}`);
    console.log(`  SqrtPriceX96: ${slot0.sqrtPriceX96}`);
    console.log(`  Tick: ${slot0.tick}`);
    console.log(`  Unlocked: ${slot0.unlocked}\n`);

    // Check if pool has liquidity
    if (liquidity === 0n) {
        console.log("❌ Pool has no liquidity! Swap will fail.");
        return;
    }

    // Check balances
    const wmon = await ethers.getContractAt([
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)"
    ], WMON_ADDRESS);

    const keep = await ethers.getContractAt([
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)"
    ], KEEP_ADDRESS);

    const userWMONBalance = await wmon.balanceOf(deployer.address);
    const userKEEPBalance = await keep.balanceOf(deployer.address);
    const routerWMONAllowance = await wmon.allowance(deployer.address, ROUTER_ADDRESS);
    const routerKEEPAllowance = await keep.allowance(deployer.address, ROUTER_ADDRESS);

    console.log("💰 User Balances:");
    console.log(`  WMON: ${ethers.formatEther(userWMONBalance)}`);
    console.log(`  KEEP: ${ethers.formatEther(userKEEPBalance)}\n`);

    console.log("✅ Allowances:");
    console.log(`  WMON -> Router: ${ethers.formatEther(routerWMONAllowance)}`);
    console.log(`  KEEP -> Router: ${ethers.formatEther(routerKEEPAllowance)}\n`);

    // Determine swap direction
    const isToken0KEEP = token0.toLowerCase() === KEEP_ADDRESS.toLowerCase();
    const isToken1WMON = token1.toLowerCase() === WMON_ADDRESS.toLowerCase();

    console.log("🔀 Swap Direction:");
    if (isToken0KEEP && isToken1WMON) {
        console.log("  Token0 = KEEP, Token1 = WMON");
        console.log("  Swapping WMON -> KEEP: zeroForOne = false\n");
    } else {
        console.log("  Unexpected token order!");
        return;
    }

    // Try a small swap
    const swapAmount = ethers.parseEther("0.01"); // 0.01 WMON
    const amountOutMinimum = 0n; // No slippage protection for test

    if (userWMONBalance < swapAmount) {
        console.log(`❌ Insufficient WMON balance. Need ${ethers.formatEther(swapAmount)}, have ${ethers.formatEther(userWMONBalance)}`);
        return;
    }

    if (routerWMONAllowance < swapAmount) {
        console.log(`⚠️  Insufficient allowance. Need to approve router first.`);
        console.log(`   Current allowance: ${ethers.formatEther(routerWMONAllowance)}`);
        console.log(`   Needed: ${ethers.formatEther(swapAmount)}`);
        return;
    }

    console.log("🔄 Attempting swap...");
    console.log(`  Amount: ${ethers.formatEther(swapAmount)} WMON`);
    console.log(`  Direction: token1 -> token0 (WMON -> KEEP)`);
    console.log(`  zeroForOne: false\n`);

    try {
        const tx = await router.swapExactInput(
            POOL_ADDRESS,
            swapAmount,
            amountOutMinimum,
            deployer.address, // recipient
            false // zeroForOne = false (token1 -> token0)
        );
        console.log(`  Transaction hash: ${tx.hash}`);
        console.log("  Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`✅ Swap successful! Gas used: ${receipt.gasUsed.toString()}`);
    } catch (error: any) {
        console.log(`❌ Swap failed: ${error.message}`);
        if (error.data) {
            console.log(`  Error data: ${error.data}`);
        }
        if (error.reason) {
            console.log(`  Reason: ${error.reason}`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

