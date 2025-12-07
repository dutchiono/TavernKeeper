import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const TAVERN_KEEPER = '0x56B81A60Ae343342685911bd97D1331fF4fa2d29';
const CELLAR_V3 = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

async function main() {
    console.log("🔧 UPDATING TAVERNKEEPER TREASURY TO TheCellarV3...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Check current treasury
    console.log("📝 Checking current treasury...");
    const tk = await ethers.getContractAt("TavernKeeper", TAVERN_KEEPER);
    const currentTreasury = await tk.treasury();
    console.log(`Current Treasury: ${currentTreasury}`);
    console.log(`Target Treasury (TheCellarV3): ${CELLAR_V3}\n`);

    if (currentTreasury.toLowerCase() === CELLAR_V3.toLowerCase()) {
        console.log("✅ Treasury is already set to TheCellarV3!");
        return;
    }

    // Check if deployer is owner
    const owner = await tk.owner();
    console.log(`TavernKeeper Owner: ${owner}`);
    console.log(`Deployer: ${deployer.address}\n`);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error("❌ ERROR: Deployer is not the owner of TavernKeeper!");
        console.error("   Cannot update treasury. Please use the owner account.");
        process.exit(1);
    }

    // Update treasury
    console.log("⬆️  Updating treasury to TheCellarV3...");
    try {
        const tx = await tk.setTreasury(CELLAR_V3);
        console.log(`Transaction: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Treasury updated successfully!");

        // Verify
        const newTreasury = await tk.treasury();
        console.log(`New Treasury: ${newTreasury}`);
        if (newTreasury.toLowerCase() === CELLAR_V3.toLowerCase()) {
            console.log("✅ Verified: Treasury is now set to TheCellarV3!");
        }
    } catch (error: any) {
        console.error("❌ Failed to update treasury:", error.message);
        throw error;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

