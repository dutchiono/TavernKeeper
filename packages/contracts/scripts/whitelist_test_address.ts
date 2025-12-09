import { ethers } from "hardhat";

/**
 * Whitelist test address and reset minted status for unlimited testing
 *
 * Usage:
 *   npx hardhat run scripts/whitelist_test_address.ts --network monad
 */

const TAVERN_KEEPER = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const ADVENTURER = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";
const TEST_ADDRESS = "0xd515674a7fe63dfdfd43fb5647e8b04eefcedcaa";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("🔧 WHITELISTING TEST ADDRESS FOR UNLIMITED MINTS...\n");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Test Address: ${TEST_ADDRESS}\n`);

    // TavernKeeper
    console.log("📝 Adding to TavernKeeper whitelist...");
    const tk = await ethers.getContractAt("TavernKeeper", TAVERN_KEEPER);

    const tkWhitelisted = await tk.whitelist(TEST_ADDRESS);
    if (!tkWhitelisted) {
        const tx1 = await tk.addToWhitelist(TEST_ADDRESS);
        await tx1.wait();
        console.log(`✅ Added to TavernKeeper whitelist (tx: ${tx1.hash})`);
    } else {
        console.log(`✅ Already whitelisted on TavernKeeper`);
    }

    // Reset minted status for TavernKeeper
    const tkMinted = await tk.whitelistMinted(TEST_ADDRESS);
    if (tkMinted) {
        console.log(`   Resetting minted status...`);
        const txReset1 = await tk.resetWhitelistMinted(TEST_ADDRESS);
        await txReset1.wait();
        console.log(`✅ Reset TavernKeeper minted status (tx: ${txReset1.hash})`);
    } else {
        console.log(`✅ TavernKeeper minted status is already reset`);
    }

    console.log();

    // Adventurer
    console.log("📝 Adding to Adventurer whitelist...");
    const adv = await ethers.getContractAt("Adventurer", ADVENTURER);

    const advWhitelisted = await adv.whitelist(TEST_ADDRESS);
    if (!advWhitelisted) {
        const tx2 = await adv.addToWhitelist(TEST_ADDRESS);
        await tx2.wait();
        console.log(`✅ Added to Adventurer whitelist (tx: ${tx2.hash})`);
    } else {
        console.log(`✅ Already whitelisted on Adventurer`);
    }

    // Reset minted status for Adventurer
    const advMinted = await adv.whitelistMinted(TEST_ADDRESS);
    if (advMinted) {
        console.log(`   Resetting minted status...`);
        const txReset2 = await adv.resetWhitelistMinted(TEST_ADDRESS);
        await txReset2.wait();
        console.log(`✅ Reset Adventurer minted status (tx: ${txReset2.hash})`);
    } else {
        console.log(`✅ Adventurer minted status is already reset`);
    }

    console.log("\n✅ Test address configured for unlimited mints!");
    console.log(`   To reset minted status again, run this script again.`);
}

main().catch((error) => {
    console.error("❌ Error:", error);
    process.exitCode = 1;
});

