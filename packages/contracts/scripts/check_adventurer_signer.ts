import { ethers } from "hardhat";

/**
 * Check Adventurer pricing signer address
 *
 * Usage:
 *   npx hardhat run scripts/check_adventurer_signer.ts --network monad
 *
 * Environment variables (optional):
 *   ADVENTURER_PROXY=0x... (defaults to mainnet: 0xb138Bf579058169e0657c12Fd9cc1267CAFcb935)
 */

const MAINNET_ADVENTURER = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";

async function main() {
    const [runner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    console.log("============================================");
    console.log("CHECK ADVENTURER PRICING SIGNER");
    console.log("============================================");
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Runner: ${runner.address}\n`);

    const isMainnet = chainId === 143n;
    const adventurerProxy = process.env.ADVENTURER_PROXY || (isMainnet ? MAINNET_ADVENTURER : "0x4Fff2Ce5144989246186462337F0eE2C086F913E");

    console.log(`Adventurer Proxy: ${adventurerProxy}\n`);

    // Minimal ABI for signer
    const ABI = [
        "function signer() view returns (address)",
        "function owner() view returns (address)",
        "function publicMintingEnabled() view returns (bool)"
    ];

    const adventurer = new ethers.Contract(adventurerProxy, ABI, runner);

    try {
        const signer = await adventurer.signer();
        console.log(`Current Pricing Signer: ${signer}`);

        const owner = await adventurer.owner();
        console.log(`Contract Owner: ${owner}`);

        const publicMintingEnabled = await adventurer.publicMintingEnabled();
        console.log(`Public Minting Enabled: ${publicMintingEnabled}`);

        console.log("\n--- Status ---");
        if (signer === ethers.ZeroAddress) {
            console.warn("⚠️  Pricing Signer is ZERO! Minting will fail.");
            console.warn("   Run: npx hardhat run scripts/set_adventurer_signer.ts --network monad");
        } else {
            console.log("✅ Pricing Signer is set.");
        }

        if (!publicMintingEnabled) {
            console.warn("⚠️  Public minting is DISABLED!");
            console.warn("   Run: npx hardhat run scripts/enable_adventurer_minting.ts --network monad");
        } else {
            console.log("✅ Public minting is enabled.");
        }

        if (signer === ethers.ZeroAddress || !publicMintingEnabled) {
            console.log("\n❌ Contract is not ready for public minting!");
        } else {
            console.log("\n✅ Contract is ready for public minting!");
        }

    } catch (e: any) {
        console.error("❌ Error reading contract state:", e.message);
        if (e.data) console.error(`   Error data: ${e.data}`);
    }
}

main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
});

