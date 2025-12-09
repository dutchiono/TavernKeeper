import { ethers } from "hardhat";

/**
 * Enable public minting on Adventurer contract
 *
 * Usage:
 *   npx hardhat run scripts/enable_adventurer_minting.ts --network monad
 *
 * Environment variables (optional):
 *   ADVENTURER_PROXY=0x... (defaults to mainnet: 0xb138Bf579058169e0657c12Fd9cc1267CAFcb935)
 *   ENABLE=true (defaults to true - set to false to disable)
 */

const MAINNET_ADVENTURER = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    console.log("============================================");
    console.log("ENABLE ADVENTURER PUBLIC MINTING");
    console.log("============================================");
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    const isMainnet = chainId === 143n;
    const adventurerProxy = process.env.ADVENTURER_PROXY || (isMainnet ? MAINNET_ADVENTURER : "0x4Fff2Ce5144989246186462337F0eE2C086F913E");
    const enable = process.env.ENABLE !== "false"; // Default to true

    console.log(`Adventurer Proxy: ${adventurerProxy}`);
    console.log(`Enable Public Minting: ${enable}\n`);

    try {
        const Adventurer = await ethers.getContractFactory("Adventurer");
        const adventurer = Adventurer.attach(adventurerProxy);

        // Check current state
        const currentState = await adventurer.publicMintingEnabled();
        console.log(`Current Public Minting Status: ${currentState}`);

        if (currentState === enable) {
            console.log(`✅ Public minting is already ${enable ? "enabled" : "disabled"}!`);
            return;
        }

        // Check if deployer is owner
        const owner = await adventurer.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.error(`❌ Deployer (${deployer.address}) is not the owner!`);
            console.error(`   Owner is: ${owner}`);
            process.exit(1);
        }

        // Enable/disable public minting
        console.log(`\n${enable ? "Enabling" : "Disabling"} public minting...`);
        const tx = await adventurer.setPublicMintingEnabled(enable);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log(`✅ Public minting ${enable ? "enabled" : "disabled"} successfully!`);

        // Verify
        const newState = await adventurer.publicMintingEnabled();
        console.log(`\nVerified Public Minting Status: ${newState}`);
        if (newState === enable) {
            console.log("✅ Verification successful!");
        } else {
            console.log("❌ Verification failed - state mismatch!");
        }
    } catch (error: any) {
        console.error(`❌ Failed to ${enable ? "enable" : "disable"} public minting: ${error.message}`);
        if (error.data) console.error(`   Error data: ${error.data}`);
        if (error.reason) console.error(`   Reason: ${error.reason}`);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
});

