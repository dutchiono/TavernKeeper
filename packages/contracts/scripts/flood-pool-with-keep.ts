import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config({ path: "../../.env" });

const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

// Target ratio: 10 KEEP = 1 MON
const TARGET_KEEP_PER_MON = 10;

// Helper to create readline interface
function createInterface(): readline.Interface {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// Helper to ask question
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    console.log("🌊 FLOODING POOL WITH LIQUIDITY AT CORRECT RATIO (10 KEEP = 1 MON)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

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
    console.log(`   KEEP: ${ethers.formatEther(keepBalance)}`);
    console.log(`   Max MON you can use (with 10:1 ratio): ${ethers.formatEther(keepBalance / BigInt(TARGET_KEEP_PER_MON))}\n`);

    // Check current pool price
    const poolABI = [
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function liquidity() external view returns (uint128)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)"
    ];
    const pool = new ethers.Contract(V3_POOL, poolABI, deployer);

    const [slot0, poolLiquidity, token0, token1] = await Promise.all([
        pool.slot0(),
        pool.liquidity(),
        pool.token0(),
        pool.token1()
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

    console.log(`📊 Current Pool State:`);
    console.log(`   Current Price: 1 MON = ${currentKeepPerMon.toFixed(6)} KEEP`);
    console.log(`   Target Price: 1 MON = ${TARGET_KEEP_PER_MON} KEEP`);
    console.log(`   Pool Liquidity: ${poolLiquidity.toString()}\n`);

    // Check for command line argument
    const args = process.argv.slice(2);
    let monAmountInput: string | null = null;

    if (args.length > 0) {
        // Check for --amount flag
        const amountIndex = args.indexOf('--amount');
        if (amountIndex !== -1 && args[amountIndex + 1]) {
            monAmountInput = args[amountIndex + 1];
        } else if (args[0] && !args[0].startsWith('--')) {
            // If first arg is not a flag, treat it as amount
            monAmountInput = args[0];
        }
    }

    // Interactive mode if no amount provided
    let amountMON: bigint;
    let amountKEEP: bigint;

    if (!monAmountInput) {
        const rl = createInterface();
        try {
            monAmountInput = await askQuestion(rl, `Enter amount of MON to use (or 'max' for all available, or 'exit' to cancel): `);
            rl.close();

            if (monAmountInput.toLowerCase() === 'exit' || monAmountInput.trim() === '') {
                console.log("Cancelled.");
                process.exit(0);
            }
        } catch (error) {
            console.error("Error reading input:", error);
            process.exit(1);
        }
    }

    // Parse amount
    if (monAmountInput.toLowerCase() === 'max') {
        // Use maximum possible while maintaining 10:1 ratio
        const maxMONFromKEEP = keepBalance / BigInt(TARGET_KEEP_PER_MON);
        amountMON = wmonBalance < maxMONFromKEEP ? wmonBalance : maxMONFromKEEP;
    } else {
        try {
            amountMON = ethers.parseEther(monAmountInput);
        } catch (error) {
            console.error(`❌ Invalid amount: ${monAmountInput}`);
            console.error("   Amount must be a valid number (e.g., 1.5, 10, 0.1)");
            process.exit(1);
        }
    }

    // Validate balance
    if (amountMON > wmonBalance) {
        console.error(`❌ Insufficient WMON balance!`);
        console.error(`   Need: ${ethers.formatEther(amountMON)} WMON`);
        console.error(`   Have: ${ethers.formatEther(wmonBalance)} WMON`);
        process.exit(1);
    }

    // Calculate required KEEP (10 KEEP per 1 MON)
    amountKEEP = amountMON * BigInt(TARGET_KEEP_PER_MON);

    // Check if we have enough KEEP
    if (amountKEEP > keepBalance) {
        console.error(`❌ Insufficient KEEP balance!`);
        console.error(`   Need: ${ethers.formatEther(amountKEEP)} KEEP (10x MON amount)`);
        console.error(`   Have: ${ethers.formatEther(keepBalance)} KEEP`);
        console.error(`\n💡 Maximum MON you can use: ${ethers.formatEther(keepBalance / BigInt(TARGET_KEEP_PER_MON))} MON`);
        process.exit(1);
    }

    // Ensure we have at least some minimum
    if (amountMON < ethers.parseEther("0.1") || amountKEEP < ethers.parseEther("1")) {
        console.log("❌ Amounts too small!");
        console.log(`   Need at least 0.1 MON and 1 KEEP`);
        process.exit(1);
    }

    console.log(`\n📊 Adding Liquidity:`);
    console.log(`   WMON: ${ethers.formatEther(amountMON)}`);
    console.log(`   KEEP: ${ethers.formatEther(amountKEEP)}`);
    console.log(`   Ratio: ${TARGET_KEEP_PER_MON} KEEP per 1 MON`);
    console.log(`   This will move price from ${currentKeepPerMon.toFixed(6)} → ${TARGET_KEEP_PER_MON} KEEP/MON\n`);

    // Confirm transaction
    if (!args.includes('--yes') && !args.includes('-y')) {
        const rl = createInterface();
        try {
            const confirm = await askQuestion(rl, "Confirm transaction? (yes/no): ");
            rl.close();

            if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
                console.log("Cancelled.");
                process.exit(0);
            }
        } catch (error) {
            console.error("Error reading confirmation:", error);
            process.exit(1);
        }
    }

    // Approve tokens
    console.log("📝 Approving tokens to TheCellarV3...");
    const approveWMON = await wmon.approve(THE_CELLAR_V3, amountMON);
    await approveWMON.wait();
    console.log("✅ WMON approved");

    const approveKEEP = await keep.approve(THE_CELLAR_V3, amountKEEP);
    await approveKEEP.wait();
    console.log("✅ KEEP approved\n");

    // Add liquidity
    const cellarABI = [
        "function addLiquidity(uint256 amountMonDesired, uint256 amountKeepDesired) external returns (uint256 liquidity)"
    ];
    const cellar = new ethers.Contract(THE_CELLAR_V3, cellarABI, deployer);

    console.log("🌊 Flooding pool with liquidity...");
    try {
        const tx = await cellar.addLiquidity(amountMON, amountKEEP);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`✅ Liquidity added! Gas used: ${receipt.gasUsed.toString()}\n`);
    } catch (error: any) {
        console.error("❌ Transaction failed:", error.message);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
        process.exit(1);
    }

    // Check pool state after
    await new Promise(resolve => setTimeout(resolve, 3000));

    const [newSlot0, newPoolLiquidity] = await Promise.all([
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

    console.log("📊 Pool State After Adding Liquidity:");
    console.log(`   Pool Address: ${V3_POOL}`);
    console.log(`   New Liquidity: ${newPoolLiquidity.toString()}`);
    console.log(`   Previous Liquidity: ${poolLiquidity.toString()}`);
    console.log(`   Liquidity Added: ${(newPoolLiquidity - poolLiquidity).toString()}`);
    console.log(`   Previous Price: 1 MON = ${currentKeepPerMon.toFixed(6)} KEEP`);
    console.log(`   New Price: 1 MON = ${newKeepPerMon.toFixed(6)} KEEP`);
    console.log(`   Target Price: 1 MON = ${TARGET_KEEP_PER_MON} KEEP\n`);

    const priceDiff = Math.abs(newKeepPerMon - TARGET_KEEP_PER_MON);
    const priceDiffPercent = (priceDiff / TARGET_KEEP_PER_MON) * 100;

    if (priceDiffPercent < 5) {
        console.log("✅ SUCCESS! Price is now very close to target (within 5%)!");
    } else if (priceDiffPercent < 20) {
        console.log(`✅ Progress! Price moved closer to target (${priceDiffPercent.toFixed(2)}% away).`);
        console.log(`   You may want to add more liquidity to get closer to 10:1 ratio.`);
    } else {
        console.log(`⚠️  Price moved but still ${priceDiffPercent.toFixed(2)}% away from target.`);
        console.log(`   Consider adding more liquidity to continue moving the price.`);
    }

    console.log(`\n💡 Tip: Run this script again with more MON/KEEP to continue moving the price toward 10:1 ratio.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

