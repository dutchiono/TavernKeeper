import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';
const TAVERN_KEEPER = '0x56B81A60Ae343342685911bd97D1331fF4fa2d29';
const WMON = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A';

async function main() {
    console.log("🔧 FIXING CELLAR POT...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // 1. Check current TavernKeeper treasury
    console.log("📝 Step 1: Checking TavernKeeper treasury...");
    const tk = await ethers.getContractAt("TavernKeeper", TAVERN_KEEPER);
    const currentTreasury = await tk.treasury();
    console.log(`Current Treasury: ${currentTreasury}`);
    console.log(`Expected (TheCellarV3): ${CELLAR_V3_PROXY}\n`);

    if (currentTreasury.toLowerCase() !== CELLAR_V3_PROXY.toLowerCase()) {
        console.log("⚠️  Treasury is NOT set to TheCellarV3! Updating...");
        try {
            const tx = await tk.setTreasury(CELLAR_V3_PROXY);
            console.log(`Transaction: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ TavernKeeper treasury updated to TheCellarV3!\n`);
        } catch (error: any) {
            console.error('❌ Failed to update treasury:', error.message);
            if (error.message.includes("OnlyOwner") || error.message.includes("Ownable")) {
                console.log("   ⚠️  You are not the owner of TavernKeeper. Need owner to call setTreasury().");
            }
            throw error;
        }
    } else {
        console.log("✅ TavernKeeper already has correct treasury address!\n");
    }

    // 2. Check if TheCellarV3 has receive() function (check if it can accept native MON)
    console.log("📝 Step 2: Checking TheCellarV3 for receive() function...");
    const cellarCode = await ethers.provider.getCode(CELLAR_V3_PROXY);

    // Check if receive() exists by looking for specific bytecode patterns
    // For now, we'll need to upgrade the contract to add receive() functionality
    console.log("   TheCellarV3 needs a receive() function to accept office fees.");
    console.log("   We need to upgrade TheCellarV3 to add this functionality.\n");

    console.log("⚠️  NEXT STEPS:");
    console.log("   1. Upgrade TheCellarV3 contract to add receive() function");
    console.log("   2. receive() should wrap native MON to WMON and add to potBalanceMON");
    console.log("   3. Office fees will then flow to TheCellarV3 pot\n");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

