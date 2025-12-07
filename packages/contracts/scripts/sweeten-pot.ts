import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

// ABI for sweetenPot
const CELLAR_ABI = [
    'function sweetenPot() payable',
    'function potBalanceMON() view returns (uint256)',
    'function wmon() view returns (address)'
];

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
    console.log("🍯 SWEETEN THE CELLAR POT\n");

    // Check for command line argument
    const args = process.argv.slice(2);
    let monAmount: string | null = null;

    if (args.length > 0) {
        // Check for --amount flag
        const amountIndex = args.indexOf('--amount');
        if (amountIndex !== -1 && args[amountIndex + 1]) {
            monAmount = args[amountIndex + 1];
        } else if (args[0] && !args[0].startsWith('--')) {
            // If first arg is not a flag, treat it as amount
            monAmount = args[0];
        }
    }

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} MON`);

    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // Get current pot balance
    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);
    const currentPot = await cellar.potBalanceMON();
    console.log(`Current Pot Balance: ${ethers.formatEther(currentPot)} WMON\n`);

    // Interactive mode if no amount provided
    if (!monAmount) {
        const rl = createInterface();
        try {
            monAmount = await askQuestion(rl, "Enter amount of MON to add to pot (or 'exit' to cancel): ");
            rl.close();

            if (monAmount.toLowerCase() === 'exit' || monAmount.trim() === '') {
                console.log("Cancelled.");
                process.exit(0);
            }
        } catch (error) {
            console.error("Error reading input:", error);
            process.exit(1);
        }
    }

    // Parse amount
    let amountWei: bigint;
    try {
        amountWei = ethers.parseEther(monAmount);
    } catch (error) {
        console.error(`❌ Invalid amount: ${monAmount}`);
        console.error("   Amount must be a valid number (e.g., 1.5, 10, 0.1)");
        process.exit(1);
    }

    // Validate balance
    if (balance < amountWei) {
        console.error(`❌ Insufficient balance!`);
        console.error(`   Need: ${ethers.formatEther(amountWei)} MON`);
        console.error(`   Have: ${ethers.formatEther(balance)} MON`);
        process.exit(1);
    }

    // Confirm transaction
    console.log(`\n📝 Transaction Details:`);
    console.log(`   Amount: ${ethers.formatEther(amountWei)} MON`);
    console.log(`   Current Pot: ${ethers.formatEther(currentPot)} WMON`);
    console.log(`   New Pot: ${ethers.formatEther(currentPot + amountWei)} WMON`);
    console.log(`   Recipient: ${CELLAR_V3_PROXY}\n`);

    // Ask for confirmation in interactive mode
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

    // Execute transaction
    try {
        console.log("🚀 Sending transaction...");
        const tx = await cellar.sweetenPot({ value: amountWei });
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

        // Check new pot balance
        const newPot = await cellar.potBalanceMON();
        console.log(`\n🎉 Pot sweetened successfully!`);
        console.log(`   New Pot Balance: ${ethers.formatEther(newPot)} WMON`);
        console.log(`   Added: ${ethers.formatEther(amountWei)} MON`);

    } catch (error: any) {
        console.error("❌ Transaction failed:", error.message);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

