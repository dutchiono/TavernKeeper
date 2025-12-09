import { ethers } from "hardhat";

/**
 * Set pricing signer address on Adventurer contract
 *
 * Usage:
 *   npx hardhat run scripts/set_adventurer_signer.ts --network monad
 *
 * Environment variables (optional):
 *   ADVENTURER_PROXY=0x... (defaults to mainnet: 0xb138Bf579058169e0657c12Fd9cc1267CAFcb935)
 *   SIGNER_ADDRESS=0x... (required - the address that signs prices, derived from PRICING_SIGNER_PRIVATE_KEY)
 */

const MAINNET_ADVENTURER = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    console.log("============================================");
    console.log("SET ADVENTURER PRICING SIGNER");
    console.log("============================================");
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    const isMainnet = chainId === 143n;
    const adventurerProxy = process.env.ADVENTURER_PROXY || (isMainnet ? MAINNET_ADVENTURER : "0x4Fff2Ce5144989246186462337F0eE2C086F913E");

    // Get signer address from environment
    // This should be the public address derived from PRICING_SIGNER_PRIVATE_KEY
    const signerAddress = process.env.SIGNER_ADDRESS || process.env.NEXT_PUBLIC_PRICING_SIGNER_ADDRESS;

    if (!signerAddress) {
        console.error("❌ SIGNER_ADDRESS or NEXT_PUBLIC_PRICING_SIGNER_ADDRESS must be set in environment");
        console.error("   This should be the public address derived from PRICING_SIGNER_PRIVATE_KEY");
        process.exit(1);
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(signerAddress)) {
        console.error(`❌ Invalid signer address format: ${signerAddress}`);
        process.exit(1);
    }

    console.log(`Adventurer Proxy: ${adventurerProxy}`);
    console.log(`Signer Address: ${signerAddress}\n`);

    try {
        const Adventurer = await ethers.getContractFactory("Adventurer");
        const adventurer = Adventurer.attach(adventurerProxy);

        // Check current signer
        const currentSigner = await adventurer.signer();
        console.log(`Current Signer: ${currentSigner}`);

        if (currentSigner.toLowerCase() === signerAddress.toLowerCase()) {
            console.log("✅ Signer is already set to this address!");
            return;
        }

        if (currentSigner !== ethers.ZeroAddress) {
            console.log(`⚠️  Signer is already set to ${currentSigner}`);
            console.log(`   This will update it to ${signerAddress}`);
        }

        // Check if deployer is owner
        const owner = await adventurer.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.error(`❌ Deployer (${deployer.address}) is not the owner!`);
            console.error(`   Owner is: ${owner}`);
            process.exit(1);
        }

        // Set signer
        console.log("\nSetting signer address...");
        const tx = await adventurer.setSigner(signerAddress);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✅ Signer set successfully!");

        // Verify
        const newSigner = await adventurer.signer();
        console.log(`\nVerified Signer: ${newSigner}`);
        if (newSigner.toLowerCase() === signerAddress.toLowerCase()) {
            console.log("✅ Verification successful!");
        } else {
            console.log("❌ Verification failed - signer mismatch!");
            console.log(`   Expected: ${signerAddress}`);
            console.log(`   Got: ${newSigner}`);
        }
    } catch (error: any) {
        console.error(`❌ Failed to set signer: ${error.message}`);
        if (error.data) console.error(`   Error data: ${error.data}`);
        if (error.reason) console.error(`   Reason: ${error.reason}`);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
});

