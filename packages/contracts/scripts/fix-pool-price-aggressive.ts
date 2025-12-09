import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const V3_SWAP_ROUTER = "0x6a043ab598826b6a694899EDa3870F6Ea9606176";
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    console.log("🔧 AGGRESSIVELY FIXING POOL PRICE TO 10 KEEP = 1 MON...\n");

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

    // Strategy: Add initial liquidity, then do multiple swaps to move price
    if (liquidity === 0n) {
        console.log("📝 Step 1: Adding initial liquidity...\n");

        // Add liquidity at current price to enable swaps
        const initialMON = ethers.parseEther("10");
        const initialKEEP = ethers.parseEther((10 * currentKeepPerMon).toFixed(6));

        if (wmonBalance < initialMON || keepBalance < initialKEEP) {
            console.log("❌ Insufficient balance!");
            return;
        }

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
    }

    // Step 2: Do multiple swaps to move price towards target
    // To move from 0.333 to 10 KEEP/MON (30x), we need to swap KEEP -> WMON
    // This will reduce KEEP supply and increase WMON supply, increasing KEEP price

    console.log("📝 Step 2: Doing swaps to move price to target...\n");

    const routerABI = [
        "function swapExactInput(address pool, uint256 amountIn, uint256 amountOutMinimum, address recipient, bool zeroForOne) external returns (uint256 amountOut)"
    ];
    const router = new ethers.Contract(V3_SWAP_ROUTER, routerABI, deployer);

    // zeroForOne = true means swap KEEP (token0) -> WMON (token1)
    const zeroForOne = isToken0KEEP;

    // Do multiple smaller swaps to avoid slippage errors
    const swapAmounts = [
        ethers.parseEther("100"),  // 100 KEEP
        ethers.parseEther("500"),  // 500 KEEP
        ethers.parseEther("1000"), // 1000 KEEP
        ethers.parseEther("2000"), // 2000 KEEP
        ethers.parseEther("5000"), // 5000 KEEP
    ];

    let remainingKEEP = keepBalance;

    for (let i = 0; i < swapAmounts.length; i++) {
        const swapKEEP = swapAmounts[i] < remainingKEEP ? swapAmounts[i] : remainingKEEP;

        if (swapKEEP === 0n) {
            console.log(`   ⚠️  No more KEEP to swap. Stopping.`);
            break;
        }

        console.log(`   Swap ${i + 1}/${swapAmounts.length}: ${ethers.formatEther(swapKEEP)} KEEP -> WMON...`);

        await (await keep.approve(V3_SWAP_ROUTER, swapKEEP)).wait();

        try {
            const tx = await router.swapExactInput(
                V3_POOL,
                swapKEEP,
                0, // amountOutMinimum
                deployer.address,
                zeroForOne
            );
            console.log(`      Transaction: ${tx.hash}`);
            await tx.wait();

            // Wait a bit for state to update
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check new price
            const newSlot0 = await pool.slot0();
            const newSqrtPrice = Number(newSlot0[0]) / Number(Q96);
            const newPrice = newSqrtPrice * newSqrtPrice;
            let newKeepPerMon: number;
            if (isToken0KEEP) {
                newKeepPerMon = 1 / newPrice;
            } else {
                newKeepPerMon = newPrice;
            }

            console.log(`      ✅ Price moved to: 1 MON = ${newKeepPerMon.toFixed(6)} KEEP\n`);

            // Check if we're close to target
            if (Math.abs(newKeepPerMon - 10) < 1) {
                console.log(`🎉 SUCCESS! Price is close to target (10 KEEP = 1 MON)!`);
                break;
            }

            remainingKEEP = await keep.balanceOf(deployer.address);

        } catch (error: any) {
            console.log(`      ⚠️  Swap failed: ${error.message}`);
            if (error.message.includes("SPL") || error.message.includes("slippage")) {
                console.log(`      Trying smaller amount...`);
                continue;
            }
            break;
        }
    }

    // Final price check
    const [finalSlot0, finalLiquidity] = await Promise.all([
        pool.slot0(),
        pool.liquidity()
    ]);

    const finalSqrtPrice = Number(finalSlot0[0]) / Number(Q96);
    const finalPrice = finalSqrtPrice * finalSqrtPrice;
    let finalKeepPerMon: number;
    if (isToken0KEEP) {
        finalKeepPerMon = 1 / finalPrice;
    } else {
        finalKeepPerMon = finalPrice;
    }

    console.log("\n📊 Final Pool State:");
    console.log(`   Liquidity: ${finalLiquidity.toString()}`);
    console.log(`   Final Price: 1 MON = ${finalKeepPerMon.toFixed(6)} KEEP\n`);

    const priceDiff = Math.abs(finalKeepPerMon - 10);
    const priceDiffPercent = (priceDiff / 10) * 100;

    if (priceDiffPercent < 10) {
        console.log(`✅ SUCCESS! Pool price is now close to target (within ${priceDiffPercent.toFixed(2)}%)!`);
        console.log(`   Pool Address: ${V3_POOL}`);
        console.log(`   Fee Tier: 1% (10000)`);
    } else {
        console.log(`⚠️  Price moved to ${finalKeepPerMon.toFixed(6)} KEEP/MON`);
        console.log(`   Still ${priceDiffPercent.toFixed(2)}% from target.`);
        console.log(`   You may need to add more liquidity or do more swaps.`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

