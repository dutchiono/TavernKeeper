import * as dotenv from "dotenv";
import { ethers, upgrades } from "hardhat";

dotenv.config({ path: "../../.env" });

// Mainnet proxy address
const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

// Dutch Auction Parameters (adjust as needed)
const INIT_PRICE = ethers.parseEther("100"); // 100 CLP tokens
const EPOCH_PERIOD = 3600; // 1 hour
const PRICE_MULTIPLIER = ethers.parseEther("2"); // 2x multiplier
const MIN_INIT_PRICE = ethers.parseEther("1"); // 1 CLP minimum floor

async function main() {
    console.log("🔧 UPGRADING TheCellarV3 TO ADD DUTCH AUCTION...\n");

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

    try {
        potBalanceMON = await currentCellar.potBalanceMON();
        potBalanceKEEP = await currentCellar.potBalanceKEEP();
        tokenId = await currentCellar.tokenId();
        owner = await currentCellar.owner();
    } catch (error: any) {
        console.error("❌ ERROR: Failed to read current state:", error.message);
        process.exit(1);
    }

    console.log(`   Pot Balance MON: ${ethers.formatEther(potBalanceMON)}`);
    console.log(`   Pot Balance KEEP: ${ethers.formatEther(potBalanceKEEP)}`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Owner: ${owner}`);

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

    let TheCellarV3Upgrade;
    try {
        TheCellarV3Upgrade = await ethers.getContractFactory("TheCellarV3Upgrade");
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
    console.log("   - Add Dutch auction state variables (already in base contract)");
    console.log("   - Add initializeAuction() function");
    console.log("   - raid() will enforce minimum bid based on current price");
    console.log("   - Price will decay over epoch period");
    console.log("   - New epoch price = initPrice * 2 (ensures growth)\n");

    console.log("   Auction Parameters:");
    console.log(`   - Init Price: ${ethers.formatEther(INIT_PRICE)} CLP`);
    console.log(`   - Epoch Period: ${EPOCH_PERIOD} seconds (${EPOCH_PERIOD / 3600} hours)`);
    console.log(`   - Price Multiplier: ${ethers.formatEther(PRICE_MULTIPLIER)}x`);
    console.log(`   - Min Init Price: ${ethers.formatEther(MIN_INIT_PRICE)} CLP\n`);

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
        const upgraded = await upgrades.upgradeProxy(CELLAR_V3_PROXY, TheCellarV3Upgrade);
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

    const upgradedCellar = TheCellarV3Upgrade.attach(CELLAR_V3_PROXY);

    // Verify state is preserved
    const newPotMON = await upgradedCellar.potBalanceMON();
    const newPotKEEP = await upgradedCellar.potBalanceKEEP();
    const newTokenId = await upgradedCellar.tokenId();
    const newOwner = await upgradedCellar.owner();

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

    // Verify new function exists
    try {
        const hasInitAuction = await upgradedCellar.initializeAuction.staticCall(
            INIT_PRICE,
            EPOCH_PERIOD,
            PRICE_MULTIPLIER,
            MIN_INIT_PRICE
        );
        console.log("   ✅ initializeAuction() function exists");
    } catch (error: any) {
        console.error("   ❌ ERROR: initializeAuction() function not found!");
        console.error("      Error:", error.message);
    }

    // ============================================
    // STEP 7: INITIALIZE AUCTION
    // ============================================
    console.log("\n🎯 STEP 6: Initializing Dutch Auction...\n");

    try {
        console.log("   Calling initializeAuction()...");
        const initTx = await upgradedCellar.initializeAuction(
            INIT_PRICE,
            EPOCH_PERIOD,
            PRICE_MULTIPLIER,
            MIN_INIT_PRICE
        );
        console.log(`   Transaction hash: ${initTx.hash}`);
        console.log("   Waiting for confirmation...");
        await initTx.wait();
        console.log("   ✅ Auction initialized!");
    } catch (error: any) {
        if (error.message && error.message.includes("already initialized")) {
            console.log("   ℹ️  Auction already initialized (this is OK)");
        } else {
            console.error("   ❌ ERROR: Failed to initialize auction:", error.message);
            throw error;
        }
    }

    // Verify auction parameters
    console.log("\n   Verifying auction parameters...");
    const epochPeriod = await upgradedCellar.epochPeriod();
    const priceMultiplier = await upgradedCellar.priceMultiplier();
    const minInitPrice = await upgradedCellar.minInitPrice();
    const slot0 = await upgradedCellar.slot0();

    console.log(`   Epoch Period: ${epochPeriod} seconds`);
    console.log(`   Price Multiplier: ${ethers.formatEther(priceMultiplier)}x`);
    console.log(`   Min Init Price: ${ethers.formatEther(minInitPrice)} CLP`);
    console.log(`   Current Init Price: ${ethers.formatEther(slot0.initPrice)} CLP`);
    console.log(`   Current Epoch ID: ${slot0.epochId}`);

    // Test getAuctionPrice()
    try {
        const currentPrice = await upgradedCellar.getAuctionPrice();
        console.log(`   Current Auction Price: ${ethers.formatEther(currentPrice)} CLP`);
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
    console.log("   2. Test raid() function with sufficient CLP balance");
    console.log("   3. Verify price decays correctly over time");
    console.log("   4. Update DEPLOYMENT_TRACKER.md with new implementation address");
    console.log("\n");
}

main().catch((error) => {
    console.error("\n❌ UPGRADE FAILED:", error);
    process.exit(1);
});

