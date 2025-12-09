import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config({ path: "../../.env" });

const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

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
    console.log("➕ ADDING LIQUIDITY AT CORRECT RATIO (10 KEEP = 1 MON)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

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
            monAmountInput = await askQuestion(rl, `Enter amount of MON to use (or 'max' for all, or 'exit' to cancel): `);
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
        amountMON = wmonBalance;
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
    amountKEEP = amountMON * 10n;

    // Check if we have enough KEEP
    if (amountKEEP > keepBalance) {
        console.error(`❌ Insufficient KEEP balance!`);
        console.error(`   Need: ${ethers.formatEther(amountKEEP)} KEEP (10x MON amount)`);
        console.error(`   Have: ${ethers.formatEther(keepBalance)} KEEP`);
        console.error(`\n💡 You can use less MON, or get more KEEP.`);
        console.error(`   Maximum MON you can use: ${ethers.formatEther(keepBalance / 10n)} MON`);
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
    console.log(`   Ratio: 10 KEEP per 1 MON\n`);

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
    await (await wmon.approve(THE_CELLAR_V3, amountMON)).wait();
    await (await keep.approve(THE_CELLAR_V3, amountKEEP)).wait();
    console.log("✅ Tokens approved!\n");

    // Add liquidity
    const cellarABI = [
        "function addLiquidity(uint256 amountMonDesired, uint256 amountKeepDesired) external returns (uint256 liquidity)"
    ];
    const cellar = new ethers.Contract(THE_CELLAR_V3, cellarABI, deployer);

    console.log("➕ Adding liquidity...");
    try {
        const tx = await cellar.addLiquidity(amountMON, amountKEEP);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        await tx.wait();
        console.log("✅ Liquidity added!\n");
    } catch (error: any) {
        console.error("❌ Transaction failed:", error.message);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
        process.exit(1);
    }

    // Check pool state
    await new Promise(resolve => setTimeout(resolve, 3000));

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

    console.log("📊 Pool State After Adding Liquidity:");
    console.log(`   Pool Address: ${V3_POOL}`);
    console.log(`   Liquidity: ${poolLiquidity.toString()}`);
    console.log(`   Current Price: 1 MON = ${currentKeepPerMon.toFixed(6)} KEEP`);
    console.log(`   Target Price: 1 MON = 10 KEEP\n`);

    console.log("✅ SUCCESS! Liquidity added at correct ratio (10 KEEP = 1 MON).");
    console.log("   The price will naturally move towards the target as people trade.");
    console.log(`   Pool Address: ${V3_POOL}`);
    console.log(`   Fee Tier: 1% (10000)`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

