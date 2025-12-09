import * as dotenv from "dotenv";
import { ethers, upgrades } from "hardhat";

dotenv.config({ path: "../../.env" });

// Mainnet proxy address (from DEPLOYMENT_TRACKER.md)
const CELLAR_V3_PROXY = process.env.THE_CELLAR_V3_PROXY || '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

async function main() {
    console.log("🔧 UPGRADING TheCellarV3 TO FIX PRICE CALCULATION BUG...\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${network.name} (Chain ID: ${chainId})\n`);

    // Safety check: Verify we're on the right network
    if (chainId !== 143 && chainId !== 10143) {
        console.error("❌ ERROR: This script is for Monad Mainnet (143) or Testnet (10143)");
        console.error(`   Current chain ID: ${chainId}`);
        process.exit(1);
    }

    const networkName = chainId === 143 ? "MAINNET" : "TESTNET";
    console.log(`⚠️  UPGRADING ON ${networkName} ⚠️\n`);

    // ============================================
    // STEP 1: VERIFY CURRENT STATE
    // ============================================
    console.log("📋 STEP 1: Verifying Current State...\n");

    const TheCellarV3 = await ethers.getContractFactory("TheCellarV3");
    const currentCellar = TheCellarV3.attach(CELLAR_V3_PROXY);

    // Get current implementation
    const currentImpl = await upgrades.erc1967.getImplementationAddress(CELLAR_V3_PROXY);
    console.log(`   Current Proxy: ${CELLAR_V3_PROXY}`);
    console.log(`   Current Implementation: ${currentImpl}`);

    // Verify proxy exists and is valid
    const proxyCode = await ethers.provider.getCode(CELLAR_V3_PROXY);
    if (proxyCode === "0x") {
        console.error("❌ ERROR: Proxy does not exist at this address!");
        process.exit(1);
    }

    // Backup current state
    console.log("\n   Backing up current state...");
    let potBalanceMON = 0n;
    let potBalanceKEEP = 0n;
    let tokenId = 0n;
    let owner = "";
    let slot0Data: any = null;

    try {
        potBalanceMON = await currentCellar.potBalanceMON();
        potBalanceKEEP = await currentCellar.potBalanceKEEP();
        tokenId = await currentCellar.tokenId();
        owner = await currentCellar.owner();
        slot0Data = await currentCellar.slot0();
    } catch (error: any) {
        console.error("❌ ERROR: Failed to read current state:", error.message);
        process.exit(1);
    }

    console.log(`   Pot Balance MON: ${ethers.formatEther(potBalanceMON)}`);
    console.log(`   Pot Balance KEEP: ${ethers.formatEther(potBalanceKEEP)}`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Current Init Price: ${ethers.formatEther(slot0Data.initPrice)}`);
    console.log(`   Current Epoch ID: ${slot0Data.epochId}`);

    // Verify deployer is owner
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error(`❌ ERROR: Deployer (${deployer.address}) is not the owner!`);
        console.error(`   Owner is: ${owner}`);
        process.exit(1);
    }

    console.log("   ✅ Current state verified\n");

    // ============================================
    // STEP 2: VERIFY UPGRADE CONTRACT COMPILES
    // ============================================
    console.log("📦 STEP 2: Verifying Upgrade Contract...\n");

    let TheCellarV3PriceFix;
    try {
        TheCellarV3PriceFix = await ethers.getContractFactory("TheCellarV3PriceFix");
        console.log("   ✅ Upgrade contract compiled successfully");
    } catch (error: any) {
        console.error("❌ ERROR: Failed to compile upgrade contract:", error.message);
        process.exit(1);
    }

    // ============================================
    // STEP 3: PREVIEW CHANGES
    // ============================================
    console.log("\n📝 STEP 3: Upgrade Preview...\n");
    console.log("   Changes to be made:");
    console.log("   - Fix raid() function: Use currentPrice instead of initPrice for next epoch");
    console.log("   - Matches Office Manager behavior: newInitPrice = currentPrice * multiplier");
    console.log("   - Prevents unbounded price growth from compounding old initPrice values");
    console.log("   - Price will now be based on what was actually paid, not the old init price\n");

    // ============================================
    // STEP 4: CONFIRMATION
    // ============================================
    console.log("⚠️  FINAL CONFIRMATION ⚠️");
    console.log(`   This will upgrade TheCellarV3 on ${networkName}`);
    console.log(`   Proxy address will remain: ${CELLAR_V3_PROXY}`);
    console.log(`   Only the implementation will change`);
    console.log(`   Current pot balances will be preserved`);
    console.log("\n   Waiting 5 seconds before proceeding...\n");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ============================================
    // STEP 5: PERFORM UPGRADE
    // ============================================
    console.log("⬆️  STEP 4: Performing Upgrade...\n");

    let upgradeTxHash: string | undefined;
    let newImpl: string;

    try {
        // Register proxy if needed (for upgrades plugin)
        try {
            await upgrades.forceImport(CELLAR_V3_PROXY, TheCellarV3, { kind: 'uups' });
            console.log("   ✅ Proxy registered with upgrades plugin");
        } catch (error: any) {
            if (error.message && error.message.includes("already registered")) {
                console.log("   ✅ Proxy already registered");
            } else {
                console.warn("   ⚠️  Warning: Could not register proxy:", error.message);
                console.warn("      Continuing anyway - upgrade may still work");
            }
        }

        // Perform upgrade
        console.log("   Upgrading proxy...");
        const upgraded = await upgrades.upgradeProxy(CELLAR_V3_PROXY, TheCellarV3PriceFix);
        const deployTx = upgraded.deploymentTransaction();

        if (deployTx) {
            upgradeTxHash = deployTx.hash;
            console.log(`   Upgrade transaction hash: ${upgradeTxHash}`);
            console.log("   Waiting for confirmation...");
            await deployTx.wait();
        }

        await upgraded.waitForDeployment();
        newImpl = await upgrades.erc1967.getImplementationAddress(CELLAR_V3_PROXY);

        console.log("   ✅ Upgrade completed!");
        console.log(`   New Implementation: ${newImpl}`);

        if (currentImpl === newImpl) {
            console.warn("   ⚠️  WARNING: Implementation address unchanged!");
            console.warn("      This might mean the upgrade didn't actually change anything.");
        }

    } catch (error: any) {
        console.error("❌ ERROR: Upgrade failed:", error.message);
        if (error.transaction) {
            console.error("   Transaction hash:", error.transaction.hash);
        }
        throw error;
    }

    // ============================================
    // STEP 6: VERIFY UPGRADE
    // ============================================
    console.log("\n✅ STEP 5: Verifying Upgrade...\n");

    const upgradedCellar = TheCellarV3PriceFix.attach(CELLAR_V3_PROXY);

    // Verify state is preserved
    const newPotMON = await upgradedCellar.potBalanceMON();
    const newPotKEEP = await upgradedCellar.potBalanceKEEP();
    const newTokenId = await upgradedCellar.tokenId();
    const newOwner = await upgradedCellar.owner();
    const newSlot0 = await upgradedCellar.slot0();

    console.log("   Verifying state preservation...");
    if (newPotMON !== potBalanceMON) {
        console.error(`   ❌ Pot MON changed: ${ethers.formatEther(potBalanceMON)} -> ${ethers.formatEther(newPotMON)}`);
    } else {
        console.log(`   ✅ Pot MON preserved: ${ethers.formatEther(newPotMON)}`);
    }

    if (newPotKEEP !== potBalanceKEEP) {
        console.error(`   ❌ Pot KEEP changed: ${ethers.formatEther(potBalanceKEEP)} -> ${ethers.formatEther(newPotKEEP)}`);
    } else {
        console.log(`   ✅ Pot KEEP preserved: ${ethers.formatEther(newPotKEEP)}`);
    }

    if (newTokenId !== tokenId) {
        console.error(`   ❌ Token ID changed: ${tokenId} -> ${newTokenId}`);
    } else {
        console.log(`   ✅ Token ID preserved: ${newTokenId}`);
    }

    if (newOwner.toLowerCase() !== owner.toLowerCase()) {
        console.error(`   ❌ Owner changed: ${owner} -> ${newOwner}`);
    } else {
        console.log(`   ✅ Owner preserved: ${newOwner}`);
    }

    if (newSlot0.initPrice !== slot0Data.initPrice) {
        console.error(`   ❌ Init Price changed: ${ethers.formatEther(slot0Data.initPrice)} -> ${ethers.formatEther(newSlot0.initPrice)}`);
    } else {
        console.log(`   ✅ Init Price preserved: ${ethers.formatEther(newSlot0.initPrice)}`);
    }

    // Test getAuctionPrice() still works
    try {
        const currentPrice = await upgradedCellar.getAuctionPrice();
        console.log(`   Current Auction Price: ${ethers.formatEther(currentPrice)}`);
        console.log("   ✅ getAuctionPrice() works!");
    } catch (error: any) {
        console.error("   ❌ ERROR: getAuctionPrice() failed:", error.message);
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("✅ UPGRADE COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`\nProxy Address (unchanged): ${CELLAR_V3_PROXY}`);
    console.log(`Old Implementation: ${currentImpl}`);
    console.log(`New Implementation: ${newImpl}`);
    if (upgradeTxHash) {
        console.log(`Upgrade TX: ${upgradeTxHash}`);
    }
    console.log("\n📝 Next Steps:");
    console.log("   1. Monitor the contract for any issues");
    console.log("   2. Test raid() function - verify new init price uses currentPrice");
    console.log("   3. Verify price calculation is now bounded by actual payments");
    console.log("   4. Update DEPLOYMENT_TRACKER.md with new implementation address");
    console.log("\n🔧 What Was Fixed:");
    console.log("   - raid() now calculates: newInitPrice = currentPrice * multiplier");
    console.log("   - Previously: newInitPrice = oldInitPrice * multiplier (could grow unbounded)");
    console.log("   - Now matches Office Manager behavior for consistent pricing");
    console.log("\n");
}

main().catch((error) => {
    console.error("\n❌ UPGRADE FAILED:", error);
    process.exit(1);
});

