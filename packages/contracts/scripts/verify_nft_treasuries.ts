import { ethers } from "hardhat";

/**
 * Verify NFT contract treasury configuration:
 * - TavernKeeper: TheCellarV3 (for Office payments 15%)
 * - Adventurer: Deployer address (for NFT mint payments)
 */

const TAVERN_KEEPER = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const ADVENTURER = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    console.log("🔍 VERIFYING NFT CONTRACT TREASURIES...\n");

    const [deployer] = await ethers.getSigners();
    const DEPLOYER_ADDRESS = deployer.address;

    const tk = await ethers.getContractAt("TavernKeeper", TAVERN_KEEPER);
    const adv = await ethers.getContractAt("Adventurer", ADVENTURER);

    const tkTreasury = await tk.treasury();
    const advTreasury = await adv.treasury();

    console.log(`TavernKeeper: ${TAVERN_KEEPER}`);
    console.log(`  Treasury: ${tkTreasury}`);
    console.log(`  Expected: ${THE_CELLAR_V3} (TheCellarV3 - for Office payments)`);
    if (tkTreasury.toLowerCase() === THE_CELLAR_V3.toLowerCase()) {
        console.log(`  ✅ Correctly set to TheCellarV3\n`);
    } else {
        console.log(`  ❌ INCORRECT! Should be TheCellarV3 for Office payments\n`);
    }

    console.log(`Adventurer: ${ADVENTURER}`);
    console.log(`  Treasury: ${advTreasury}`);
    console.log(`  Expected: ${DEPLOYER_ADDRESS} (Deployer - for NFT mint payments)`);
    if (advTreasury.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase()) {
        console.log(`  ✅ Correctly set to Deployer\n`);
    } else {
        console.log(`  ❌ INCORRECT! Should be Deployer for NFT mint payments\n`);
    }

    const tkCorrect = tkTreasury.toLowerCase() === THE_CELLAR_V3.toLowerCase();
    const advCorrect = advTreasury.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase();

    if (tkCorrect && advCorrect) {
        console.log("✅ Both contracts correctly configured!");
        console.log("   - TavernKeeper NFT mint payments → Owner (Deployer) wallet");
        console.log("   - TavernKeeper Office payments (15%) → TheCellarV3 (pot)");
        console.log("   - Adventurer NFT mint payments → Deployer wallet");
    } else {
        console.log("❌ Configuration issue detected!");
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Error:", error);
    process.exitCode = 1;
});

