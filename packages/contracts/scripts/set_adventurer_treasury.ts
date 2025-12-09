import { ethers } from "hardhat";

/**
 * Set Adventurer treasury address
 *
 * Usage:
 *   npx hardhat run scripts/set_adventurer_treasury.ts --network monad
 *
 * Environment variables (optional):
 *   ADVENTURER_PROXY=0x... (defaults to mainnet: 0xb138Bf579058169e0657c12Fd9cc1267CAFcb935)
 *   TREASURY_ADDRESS=0x... (defaults to TavernKeeper treasury: 0x32A920be00dfCE1105De0415ba1d4f06942E9ed0)
 */

const MAINNET_ADVENTURER = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";
const MAINNET_TREASURY = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    console.log("============================================");
    console.log("SET ADVENTURER TREASURY");
    console.log("============================================");
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    const isMainnet = chainId === 143n;
    const adventurerProxy = process.env.ADVENTURER_PROXY || (isMainnet ? MAINNET_ADVENTURER : "0x4Fff2Ce5144989246186462337F0eE2C086F913E");
    const treasuryAddress = process.env.TREASURY_ADDRESS || (isMainnet ? MAINNET_TREASURY : deployer.address);

    console.log(`Adventurer Proxy: ${adventurerProxy}`);
    console.log(`Treasury Address: ${treasuryAddress}\n`);

    try {
        const Adventurer = await ethers.getContractFactory("Adventurer");
        const adventurer = Adventurer.attach(adventurerProxy);

        // Check current treasury
        const currentTreasury = await adventurer.treasury();
        console.log(`Current Treasury: ${currentTreasury}`);

        if (currentTreasury === treasuryAddress) {
            console.log("✅ Treasury is already set to this address!");
            return;
        }

        if (currentTreasury !== ethers.ZeroAddress) {
            console.log(`⚠️  Treasury is already set to ${currentTreasury}`);
            console.log(`   This will update it to ${treasuryAddress}`);
        }

        // Set treasury
        console.log("\nSetting treasury...");
        const tx = await adventurer.setTreasury(treasuryAddress);
        console.log(`Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Treasury set successfully!");

        // Verify
        const newTreasury = await adventurer.treasury();
        console.log(`\nVerified Treasury: ${newTreasury}`);
        if (newTreasury === treasuryAddress) {
            console.log("✅ Verification successful!");
        } else {
            console.log("❌ Verification failed - treasury mismatch!");
        }
    } catch (error: any) {
        console.error(`❌ Failed to set treasury: ${error.message}`);
        if (error.data) console.error(`   Error data: ${error.data}`);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
});

