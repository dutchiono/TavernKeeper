import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

/**
 * Generate test wallets for Monad testnet
 * 
 * This script generates 10 test wallets and saves their private keys securely.
 * WARNING: These are testnet wallets only. Never use for mainnet.
 */

interface TestWallet {
    index: number;
    address: string;
    privateKey: string;
    mnemonic?: string;
}

async function main() {
    const walletsDir = path.join(__dirname, "..", "wallets");
    
    // Create wallets directory if it doesn't exist
    if (!fs.existsSync(walletsDir)) {
        fs.mkdirSync(walletsDir, { recursive: true });
    }

    const wallets: TestWallet[] = [];
    const deployerKey = process.env.TESTNET_PRIVATE_KEY;
    
    if (!deployerKey) {
        throw new Error("TESTNET_PRIVATE_KEY not set in environment");
    }

    // Get deployer wallet
    const deployerWallet = new ethers.Wallet(deployerKey);
    console.log("Deployer wallet:", deployerWallet.address);
    console.log("Generating 10 test wallets...\n");

    // Generate 10 test wallets
    for (let i = 1; i <= 10; i++) {
        const wallet = ethers.Wallet.createRandom();
        wallets.push({
            index: i,
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic?.phrase,
        });
        console.log(`Wallet ${i}: ${wallet.address}`);
    }

    // Save wallets to JSON file (encrypted or at least not in git)
    const walletsFile = path.join(walletsDir, "testnet-wallets.json");
    fs.writeFileSync(
        walletsFile,
        JSON.stringify(
            {
                deployer: {
                    address: deployerWallet.address,
                    // Don't save deployer private key - it's in .env
                },
                testWallets: wallets.map(w => ({
                    index: w.index,
                    address: w.address,
                    // Private keys saved separately for security
                })),
                generatedAt: new Date().toISOString(),
                network: "Monad Testnet",
            },
            null,
            2
        )
    );

    // Save private keys to separate file (add to .gitignore)
    const keysFile = path.join(walletsDir, "testnet-keys.json");
    const keysData = {
        deployer: deployerWallet.address,
        testWallets: wallets.map(w => ({
            index: w.index,
            address: w.address,
            privateKey: w.privateKey,
            mnemonic: w.mnemonic,
        })),
        warning: "KEEP THIS FILE SECURE - NEVER COMMIT TO GIT",
        generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(keysFile, JSON.stringify(keysData, null, 2));

    // Create .gitignore in wallets directory
    const gitignoreFile = path.join(walletsDir, ".gitignore");
    fs.writeFileSync(gitignoreFile, "testnet-keys.json\n*.json\n");

    console.log("\n=== Wallets Generated ===");
    console.log(`Wallets saved to: ${walletsFile}`);
    console.log(`Private keys saved to: ${keysFile}`);
    console.log("\n⚠️  WARNING: Keep testnet-keys.json secure!");
    console.log("⚠️  This file is gitignored but contains sensitive data.");
    console.log("\n=== Wallet Summary ===");
    console.log(`Deployer: ${deployerWallet.address}`);
    wallets.forEach(w => {
        console.log(`Test Wallet ${w.index}: ${w.address}`);
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


