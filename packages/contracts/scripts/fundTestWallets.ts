import { ethers } from "hardhat";

/**
 * Fund test wallets with 1 MON each from deployer
 * 
 * Usage:
 *   npx hardhat run scripts/fundTestWallets.ts --network monad
 */

interface WalletData {
    index: number;
    address: string;
    privateKey: string;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Funding wallets with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "MON");

    // Load test wallets
    const fs = require("fs");
    const path = require("path");
    const keysFile = path.join(__dirname, "..", "wallets", "testnet-keys.json");
    
    if (!fs.existsSync(keysFile)) {
        throw new Error("testnet-keys.json not found. Run generateTestWallets.ts first.");
    }

    const keysData = JSON.parse(fs.readFileSync(keysFile, "utf8"));
    const testWallets: WalletData[] = keysData.testWallets;

    if (!testWallets || testWallets.length === 0) {
        throw new Error("No test wallets found in keys file");
    }

    console.log(`\nFunding ${testWallets.length} test wallets with 1 MON each...\n`);

    const fundingAmount = ethers.parseEther("1.0"); // 1 MON per wallet
    const totalNeeded = fundingAmount * BigInt(testWallets.length);
    const gasEstimate = 21000n; // Standard transfer
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei");
    const totalGas = gasEstimate * gasPrice * BigInt(testWallets.length);
    const totalRequired = totalNeeded + totalGas;

    console.log(`Total MON needed: ${ethers.formatEther(totalRequired)}`);
    console.log(`  - For wallets: ${ethers.formatEther(totalNeeded)}`);
    console.log(`  - For gas: ${ethers.formatEther(totalGas)}\n`);

    if (balance < totalRequired) {
        throw new Error(`Insufficient balance. Need ${ethers.formatEther(totalRequired)} MON, have ${ethers.formatEther(balance)} MON`);
    }

    // Fund each wallet
    for (const wallet of testWallets) {
        try {
            console.log(`Funding wallet ${wallet.index} (${wallet.address})...`);
            const tx = await deployer.sendTransaction({
                to: wallet.address,
                value: fundingAmount,
            });
            await tx.wait();
            console.log(`  ✓ Funded with 1 MON (tx: ${tx.hash})`);
        } catch (error) {
            console.error(`  ✗ Failed to fund wallet ${wallet.index}:`, error);
        }
    }

    console.log("\n=== Funding Complete ===");
    const remainingBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`Remaining deployer balance: ${ethers.formatEther(remainingBalance)} MON`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

