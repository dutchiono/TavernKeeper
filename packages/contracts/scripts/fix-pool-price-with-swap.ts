import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const V3_SWAP_ROUTER = "0x6a043ab598826b6a694899EDa3870F6Ea9606176";
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const POOL_FEE = 10000; // 1%

async function main() {
    console.log("🔧 FIXING POOL PRICE BY SWAPPING THEN ADDING LIQUIDITY...\n");

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

    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(slot0[0]) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;

    let currentKeepPerMon: number;
    if (isToken0KEEP) {
        currentKeepPerMon = 1 / price;
    } else {
        currentKeepPerMon = price;
    }

    console.log("📊 Current Pool State:");
    console.log(`   Token0: ${token0} (${isToken0KEEP ? "KEEP" : "WMON"})`);
    console.log(`   Token1: ${token1} (${isToken0KEEP ? "WMON" : "KEEP"})`);
    console.log(`   Liquidity: ${liquidity.toString()}`);
    console.log(`   Current Price: 1 MON = ${currentKeepPerMon.toFixed(6)} KEEP`);
    console.log(`   Target Price: 1 MON = 10 KEEP\n`);

    // Check balances
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

    // Step 1: Add initial liquidity (if pool is empty)
    if (liquidity === 0n) {
        console.log("📝 Step 1: Adding initial liquidity to enable swaps...\n");

        // Add small amount at current price to enable swaps
        const initialMON = ethers.parseEther("1");
        const initialKEEP = ethers.parseEther((1 * currentKeepPerMon).toFixed(18)); // At current price

        if (wmonBalance < initialMON || keepBalance < initialKEEP) {
            console.log("❌ Insufficient balance for initial liquidity!");
            return;
        }

        console.log(`   Adding: ${ethers.formatEther(initialMON)} WMON, ${ethers.formatEther(initialKEEP)} KEEP`);

        // Approve and add liquidity
        await (await wmon.approve(THE_CELLAR_V3, initialMON)).wait();
        await (await keep.approve(THE_CELLAR_V3, initialKEEP)).wait();

        const cellarABI = [
            "function addLiquidity(uint256 amountMonDesired, uint256 amountKeepDesired) external returns (uint256 liquidity)"
        ];
        const cellar = new ethers.Contract(THE_CELLAR_V3, cellarABI, deployer);

        const tx1 = await cellar.addLiquidity(initialMON, initialKEEP);
        console.log(`   Transaction: ${tx1.hash}`);
        await tx1.wait();
        console.log("✅ Initial liquidity added!\n");

        // Wait and check new liquidity
        await new Promise(resolve => setTimeout(resolve, 3000));
        const newLiquidity = await pool.liquidity();
        console.log(`   New Pool Liquidity: ${newLiquidity.toString()}\n`);
    }

    // Step 2: Swap to move price towards target
    // Current: 1 MON = 0.333 KEEP, Target: 1 MON = 10 KEEP
    // To move price UP (more KEEP per MON), we need to swap KEEP -> WMON
    // This will reduce KEEP supply and increase WMON supply, increasing KEEP price

    console.log("📝 Step 2: Swapping to move price towards target...\n");

    // Calculate swap amount needed
    // We want to move from 0.333 to 10 KEEP/MON (30x change - very large!)
    // Need to swap carefully to avoid slippage
    // Start with smaller amount and do multiple swaps
    const swapKEEP = ethers.parseEther("10"); // Start with 10 KEEP

    if (keepBalance < swapKEEP) {
        console.log(`⚠️  Not enough KEEP to swap (need ${ethers.formatEther(swapKEEP)})`);
        console.log(`   Will use available balance: ${ethers.formatEther(keepBalance)}`);
    }

    const actualSwapKEEP = keepBalance < swapKEEP ? keepBalance : swapKEEP;

    // Approve swap router
    await (await keep.approve(V3_SWAP_ROUTER, actualSwapKEEP)).wait();
    console.log(`   Approved ${ethers.formatEther(actualSwapKEEP)} KEEP for swap\n`);

    // Get swap router ABI
    const routerABI = [
        "function swapExactInput(address pool, uint256 amountIn, uint256 amountOutMinimum, address recipient, bool zeroForOne) external returns (uint256 amountOut)"
    ];
    const router = new ethers.Contract(V3_SWAP_ROUTER, routerABI, deployer);

    // zeroForOne: false means swapping token1 (WMON) for token0 (KEEP)
    // But we want KEEP -> WMON, so if token0=KEEP, token1=WMON, we want zeroForOne=true
    const zeroForOne = isToken0KEEP; // true = swap KEEP -> WMON

    console.log(`   Swapping ${ethers.formatEther(actualSwapKEEP)} KEEP -> WMON...`);
    console.log(`   zeroForOne: ${zeroForOne} (${zeroForOne ? "KEEP->WMON" : "WMON->KEEP"})\n`);

    try {
        const tx2 = await router.swapExactInput(
            V3_POOL,
            actualSwapKEEP,
            0, // amountOutMinimum - set to 0 for now
            deployer.address,
            zeroForOne
        );
        console.log(`   Transaction: ${tx2.hash}`);
        await tx2.wait();
        console.log("✅ Swap completed!\n");

        // Check new price
        await new Promise(resolve => setTimeout(resolve, 3000));
        const [newSlot0, newLiquidity] = await Promise.all([
            pool.slot0(),
            pool.liquidity()
        ]);

        const newSqrtPrice = Number(newSlot0[0]) / Number(Q96);
        const newPrice = newSqrtPrice * newSqrtPrice;

        let newKeepPerMon: number;
        if (isToken0KEEP) {
            newKeepPerMon = 1 / newPrice;
        } else {
            newKeepPerMon = newPrice;
        }

        console.log("📊 New Pool State After Swap:");
        console.log(`   Liquidity: ${newLiquidity.toString()}`);
        console.log(`   New Price: 1 MON = ${newKeepPerMon.toFixed(6)} KEEP\n`);

        const priceDiff = Math.abs(newKeepPerMon - 10);
        const priceDiffPercent = (priceDiff / 10) * 100;

        if (priceDiffPercent < 10) {
            console.log(`✅ SUCCESS! Price is now close to target (within ${priceDiffPercent.toFixed(2)}%)!`);
        } else {
            console.log(`⚠️  Price moved from ${currentKeepPerMon.toFixed(6)} to ${newKeepPerMon.toFixed(6)} KEEP/MON`);
            console.log(`   Still ${priceDiffPercent.toFixed(2)}% from target. May need more swaps or liquidity.`);
        }
    } catch (error: any) {
        console.error("❌ Swap failed:", error.message);
        if (error.message.includes("STF") || error.message.includes("liquidity")) {
            console.log("\n💡 Pool might not have enough liquidity for the swap. Try a smaller amount.");
        }
        throw error;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

