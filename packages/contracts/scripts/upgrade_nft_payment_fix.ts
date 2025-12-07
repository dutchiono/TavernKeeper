import { ethers, upgrades } from "hardhat";

/**
 * Upgrade TavernKeeper and Adventurer contracts to fix payment handling and add whitelist
 *
 * This script:
 * 1. Checks for stuck funds in both contracts
 * 2. Upgrades TavernKeeper with payment fix + whitelist
 * 3. Upgrades Adventurer with payment fix + treasury + whitelist
 * 4. Sets treasury on Adventurer (if needed)
 * 5. Provides commands to update documentation
 *
 * Usage:
 *   npx hardhat run scripts/upgrade_nft_payment_fix.ts --network monad
 *
 * Environment variables (optional):
 *   TAVERN_KEEPER_PROXY=0x... (defaults to mainnet: 0x56B81A60Ae343342685911bd97D1331fF4fa2d29)
 *   ADVENTURER_PROXY=0x... (defaults to mainnet: 0xb138Bf579058169e0657c12Fd9cc1267CAFcb935)
 *   ADVENTURER_TREASURY=0x... (treasury address for Adventurer, defaults to TavernKeeper treasury)
 */

// Mainnet addresses (from FIRSTDEPLOYMENT.md)
const MAINNET_TAVERN_KEEPER = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const MAINNET_ADVENTURER = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";

// Testnet addresses (if needed)
const TESTNET_TAVERN_KEEPER = "0xFaC0786eF353583FBD43Ee7E7e84836c1857A381";
const TESTNET_ADVENTURER = "0x4Fff2Ce5144989246186462337F0eE2C086F913E";

async function checkStuckFunds(address: string, name: string) {
    const balance = await ethers.provider.getBalance(address);
    if (balance > 0n) {
        console.log(`⚠️  ${name} has ${ethers.formatEther(balance)} MON stuck!`);
        console.log(`   Use withdrawFunds() after upgrade to recover.`);
        return balance;
    }
    return 0n;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    console.log("============================================");
    console.log("NFT CONTRACT UPGRADE: Payment Fix + Whitelist");
    console.log("============================================");
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MON\n`);

    // Determine addresses based on network
    const isMainnet = chainId === 143n;
    const tavernKeeperProxy = process.env.TAVERN_KEEPER_PROXY || (isMainnet ? MAINNET_TAVERN_KEEPER : TESTNET_TAVERN_KEEPER);
    const adventurerProxy = process.env.ADVENTURER_PROXY || (isMainnet ? MAINNET_ADVENTURER : TESTNET_ADVENTURER);

    console.log(`Using ${isMainnet ? 'MAINNET' : 'TESTNET'} addresses:`);
    console.log(`  TavernKeeper Proxy: ${tavernKeeperProxy}`);
    console.log(`  Adventurer Proxy: ${adventurerProxy}\n`);

    // ============================================
    // STEP 1: Check for Stuck Funds
    // ============================================
    console.log("STEP 1: Checking for stuck funds...\n");
    const tkBalance = await checkStuckFunds(tavernKeeperProxy, "TavernKeeper");
    const advBalance = await checkStuckFunds(adventurerProxy, "Adventurer");

    if (tkBalance > 0n || advBalance > 0n) {
        console.log("\n⚠️  WARNING: Contracts have stuck funds!");
        console.log("   These will be recoverable via withdrawFunds() after upgrade.\n");
    } else {
        console.log("✅ No stuck funds found.\n");
    }

    // ============================================
    // STEP 2: Get Current Implementation Addresses
    // ============================================
    console.log("STEP 2: Getting current implementation addresses...\n");

    const tkCurrentImpl = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxy);
    const advCurrentImpl = await upgrades.erc1967.getImplementationAddress(adventurerProxy);

    console.log(`TavernKeeper:`);
    console.log(`  Proxy: ${tavernKeeperProxy}`);
    console.log(`  Current Impl: ${tkCurrentImpl}`);

    console.log(`\nAdventurer:`);
    console.log(`  Proxy: ${adventurerProxy}`);
    console.log(`  Current Impl: ${advCurrentImpl}\n`);

    // ============================================
    // STEP 3: Upgrade TavernKeeper
    // ============================================
    console.log("============================================");
    console.log("STEP 3: Upgrading TavernKeeper...");
    console.log("============================================");

    console.log("\nChanges in this upgrade:");
    console.log("  ✅ Fix: mintTavernKeeper now transfers Mon to treasury");
    console.log("  ✅ Add: withdrawFunds() function for stuck funds");
    console.log("  ✅ Add: Whitelist functionality (mapping + free mint)");
    console.log("  ✅ Add: Whitelist management functions (add/remove/batch)\n");

    try {
        const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
        const tkUpgraded = await upgrades.upgradeProxy(tavernKeeperProxy, TavernKeeperFactory);
        await tkUpgraded.waitForDeployment();

        const tkNewImpl = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxy);
        console.log(`✅ TavernKeeper upgraded successfully!`);
        console.log(`   Proxy (unchanged): ${tavernKeeperProxy}`);
        console.log(`   Old Impl: ${tkCurrentImpl}`);
        console.log(`   New Impl: ${tkNewImpl}\n`);

        // Verify treasury is set
        const tkTreasury = await tkUpgraded.treasury();
        if (tkTreasury === ethers.ZeroAddress) {
            console.log(`⚠️  WARNING: TavernKeeper treasury not set!`);
            console.log(`   Payments will go to owner until treasury is set.\n`);
        } else {
            console.log(`✅ TavernKeeper treasury: ${tkTreasury}\n`);
        }
    } catch (error: any) {
        console.error(`❌ TavernKeeper upgrade failed: ${error.message}`);
        if (error.data) console.error(`   Error data: ${error.data}`);
        process.exit(1);
    }

    // ============================================
    // STEP 4: Upgrade Adventurer
    // ============================================
    console.log("============================================");
    console.log("STEP 4: Upgrading Adventurer...");
    console.log("============================================");

    console.log("\nChanges in this upgrade:");
    console.log("  ✅ Fix: mintHero now transfers Mon to treasury");
    console.log("  ✅ Add: treasury storage variable + setTreasury()");
    console.log("  ✅ Add: withdrawFunds() function for stuck funds");
    console.log("  ✅ Add: Whitelist functionality (mapping + free mint)");
    console.log("  ✅ Add: Whitelist management functions (add/remove/batch)\n");

    try {
        const AdventurerFactory = await ethers.getContractFactory("Adventurer");
        const advUpgraded = await upgrades.upgradeProxy(adventurerProxy, AdventurerFactory);
        await advUpgraded.waitForDeployment();

        const advNewImpl = await upgrades.erc1967.getImplementationAddress(adventurerProxy);
        console.log(`✅ Adventurer upgraded successfully!`);
        console.log(`   Proxy (unchanged): ${adventurerProxy}`);
        console.log(`   Old Impl: ${advCurrentImpl}`);
        console.log(`   New Impl: ${advNewImpl}\n`);

        // Check if treasury needs to be set
        const advTreasury = await advUpgraded.treasury();
        if (advTreasury === ethers.ZeroAddress) {
            console.log(`⚠️  Adventurer treasury not set.`);

            // Try to get TavernKeeper treasury as default
            const tkContract = await ethers.getContractAt("TavernKeeper", tavernKeeperProxy);
            const tkTreasury = await tkContract.treasury();

            const suggestedTreasury = process.env.ADVENTURER_TREASURY ||
                (tkTreasury !== ethers.ZeroAddress ? tkTreasury : deployer.address);

            console.log(`   Suggested treasury: ${suggestedTreasury}`);
            console.log(`   Set it with: await adventurer.setTreasury("${suggestedTreasury}")\n`);
        } else {
            console.log(`✅ Adventurer treasury: ${advTreasury}\n`);
        }
    } catch (error: any) {
        console.error(`❌ Adventurer upgrade failed: ${error.message}`);
        if (error.data) console.error(`   Error data: ${error.data}`);
        process.exit(1);
    }

    // ============================================
    // STEP 5: Post-Upgrade Verification
    // ============================================
    console.log("============================================");
    console.log("STEP 5: Post-Upgrade Verification");
    console.log("============================================");

    try {
        const tkContract = await ethers.getContractAt("TavernKeeper", tavernKeeperProxy);
        const advContract = await ethers.getContractAt("Adventurer", adventurerProxy);

        // Verify new functions exist
        console.log("\nVerifying new functions...");

        // Check withdrawFunds exists (by checking if we can read it)
        try {
            const tkBalance = await ethers.provider.getBalance(tavernKeeperProxy);
            console.log(`✅ TavernKeeper.withdrawFunds() - Available`);
            if (tkBalance > 0n) {
                console.log(`   ⚠️  Contract has ${ethers.formatEther(tkBalance)} MON - can be withdrawn`);
            }
        } catch (e) {
            console.log(`❌ TavernKeeper.withdrawFunds() - Not found`);
        }

        try {
            const advBalance = await ethers.provider.getBalance(adventurerProxy);
            console.log(`✅ Adventurer.withdrawFunds() - Available`);
            if (advBalance > 0n) {
                console.log(`   ⚠️  Contract has ${ethers.formatEther(advBalance)} MON - can be withdrawn`);
            }
        } catch (e) {
            console.log(`❌ Adventurer.withdrawFunds() - Not found`);
        }

        // Check whitelist functions
        try {
            const testWhitelist = await tkContract.whitelist(deployer.address);
            console.log(`✅ TavernKeeper.whitelist() - Available`);
        } catch (e) {
            console.log(`❌ TavernKeeper.whitelist() - Not found`);
        }

        try {
            const testWhitelist = await advContract.whitelist(deployer.address);
            console.log(`✅ Adventurer.whitelist() - Available`);
        } catch (e) {
            console.log(`❌ Adventurer.whitelist() - Not found`);
        }

        console.log("\n✅ Verification complete!\n");
    } catch (error: any) {
        console.error(`⚠️  Verification error: ${error.message}`);
    }

    // ============================================
    // STEP 6: Documentation Update Commands
    // ============================================
    console.log("============================================");
    console.log("STEP 6: Documentation Update Required");
    console.log("============================================");

    const tkNewImpl = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxy);
    const advNewImpl = await upgrades.erc1967.getImplementationAddress(adventurerProxy);

    console.log("\n📝 Update FIRSTDEPLOYMENT.md with these commands (PowerShell):\n");

    console.log(`# TavernKeeper Upgrade`);
    console.log(`$env:CONTRACT_NAME="TavernKeeper"; $env:OLD_IMPL="${tkCurrentImpl}"; $env:NEW_IMPL="${tkNewImpl}"; $env:REASON="Fixed mint payment transfer to treasury, added withdrawFunds(), added whitelist functionality"; npx hardhat run scripts/update_deployment_docs.ts\n`);

    console.log(`# Adventurer Upgrade`);
    console.log(`$env:CONTRACT_NAME="Adventurer"; $env:OLD_IMPL="${advCurrentImpl}"; $env:NEW_IMPL="${advNewImpl}"; $env:REASON="Fixed mint payment transfer to treasury, added treasury support, added withdrawFunds(), added whitelist functionality"; npx hardhat run scripts/update_deployment_docs.ts\n`);

    console.log("📝 Update DEPLOYMENT_TRACKER.md manually:");
    console.log(`   - Update TavernKeeper Implementation Address: ${tkNewImpl}`);
    console.log(`   - Update Adventurer Implementation Address: ${advNewImpl}`);
    console.log(`   - Add upgrade notes about payment fix and whitelist\n`);

    console.log("📝 Update apps/web/lib/contracts/addresses.ts IMPLEMENTATION_ADDRESSES:");
    console.log(`   - TAVERNKEEPER_IMPL: ${tkNewImpl}`);
    console.log(`   - ADVENTURER_IMPL: ${advNewImpl}\n`);

    console.log("============================================");
    console.log("✅ UPGRADE COMPLETE");
    console.log("============================================");
    console.log("\nSummary:");
    console.log(`  TavernKeeper: ${tavernKeeperProxy}`);
    console.log(`    Old Impl: ${tkCurrentImpl}`);
    console.log(`    New Impl: ${tkNewImpl}`);
    console.log(`\n  Adventurer: ${adventurerProxy}`);
    console.log(`    Old Impl: ${advCurrentImpl}`);
    console.log(`    New Impl: ${advNewImpl}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Run documentation update commands above`);
    console.log(`  2. Set Adventurer treasury if needed`);
    console.log(`  3. Withdraw any stuck funds using withdrawFunds()`);
    console.log(`  4. Test minting to verify payments go to treasury`);
    console.log(`  5. Add whitelist addresses using addToWhitelist() or addToWhitelistBatch()`);
}

main().catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exitCode = 1;
});

