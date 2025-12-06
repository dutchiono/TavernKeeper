import { ethers, upgrades } from "hardhat";
import { updateDeploymentTracker } from "./updateDeploymentTracker";
import { updateFrontendAddresses } from "./updateFrontend";

/**
 * Upgrade script for CellarHook - Price Calculation Fix (Glaze-like behavior)
 *
 * This upgrade fixes the price calculation in the raid() function to use initPrice
 * instead of paymentAmount, ensuring price grows over time like "glaze" in donut miner.
 *
 * CHANGE:
 *   - Line 756: Changed from `paymentAmount * priceMultiplier` to `slot0Cache.initPrice * priceMultiplier`
 *   - This ensures new epoch price is based on the starting price of the previous epoch, not the settlement price
 *   - Result: Price grows over time instead of oscillating between floor and 2x floor
 *
 * Usage:
 *   $env:NEXT_PUBLIC_MONAD_CHAIN_ID="143"  # Mainnet (or "10143" for testnet)
 *   npx hardhat run scripts/upgrade_cellarhook_price_fix.ts --network monad
 *
 * Environment variables (optional):
 *   CELLAR_HOOK_PROXY=0x... (CellarHook proxy address, defaults to mainnet address)
 *   PRIVATE_KEY=0x... (Deployer private key)
 *
 * SAFETY CHECKS:
 *   - Verifies chain ID matches expected network
 *   - Verifies proxy exists and is valid
 *   - Gets current implementation before upgrade
 *   - Verifies new implementation is different
 *   - Updates frontend addresses and deployment tracker
 */

// Mainnet proxy address (from addresses.ts)
const MAINNET_CELLAR_HOOK_PROXY = "0xe71CAf7162dd81a4A9C0c6BD25ED02C26F492DC0";

// Testnet proxy address (from addresses.ts)
const TESTNET_CELLAR_HOOK_PROXY = "0xA43034595E2d1c52Ab08a057B95dD38bCbFf87dC";

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log("=== UPGRADING CELLARHOOK - PRICE CALCULATION FIX ===");
    console.log("Deployer:", deployer.address);
    console.log("Network:", network.name);
    console.log("Chain ID:", chainId);

    // Determine which network we're on and get proxy address
    let CELLAR_HOOK_PROXY: string;
    let networkName: string;

    if (chainId === 143) {
        // Monad Mainnet
        networkName = "Monad Mainnet";
        CELLAR_HOOK_PROXY = process.env.CELLAR_HOOK_PROXY || MAINNET_CELLAR_HOOK_PROXY;
        console.log("\n✅ Detected: Monad Mainnet");
    } else if (chainId === 10143) {
        // Monad Testnet
        networkName = "Monad Testnet";
        CELLAR_HOOK_PROXY = process.env.CELLAR_HOOK_PROXY || TESTNET_CELLAR_HOOK_PROXY;
        console.log("\n✅ Detected: Monad Testnet");
    } else {
        console.error("❌ ERROR: Unsupported network!");
        console.error(`   Current chain ID: ${chainId}`);
        console.error("   Supported: 143 (Mainnet) or 10143 (Testnet)");
        console.error("   Set NEXT_PUBLIC_MONAD_CHAIN_ID environment variable");
        process.exit(1);
    }

    console.log("\n--- Proxy Address ---");
    console.log("CellarHook Proxy:", CELLAR_HOOK_PROXY);

    // SAFETY CHECK 1: Verify proxy exists
    console.log("\n--- Safety Checks ---");
    const hookCode = await ethers.provider.getCode(CELLAR_HOOK_PROXY);
    if (hookCode === "0x") {
        console.error("❌ CellarHook proxy not found at:", CELLAR_HOOK_PROXY);
        console.error("   Please verify the proxy address is correct");
        process.exit(1);
    }
    console.log("✅ Proxy exists and has code");

    // SAFETY CHECK 2: Verify it's a UUPS proxy
    try {
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(CELLAR_HOOK_PROXY);
        console.log("✅ Proxy is upgradeable (UUPS)");
        console.log("   Current Implementation:", implementationAddress);
    } catch (error: any) {
        console.error("❌ Failed to get implementation address:", error.message);
        console.error("   This may not be a valid UUPS proxy");
        process.exit(1);
    }

    // SAFETY CHECK 3: Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "MON");
    if (balance < ethers.parseEther("0.1")) {
        console.warn("⚠️  WARNING: Low balance! Ensure you have enough MON for gas.");
        console.warn("   Recommended: At least 0.5 MON for upgrade transaction");
    }

    // Get current implementation before upgrade
    const currentHookImpl = await upgrades.erc1967.getImplementationAddress(CELLAR_HOOK_PROXY);
    console.log("\n--- Current State ---");
    console.log("Proxy Address:", CELLAR_HOOK_PROXY);
    console.log("Current Implementation:", currentHookImpl);

    // Verify deployer is owner (can upgrade)
    try {
        const CellarHook = await ethers.getContractFactory("CellarHook");
        const hook = CellarHook.attach(CELLAR_HOOK_PROXY);
        const owner = await hook.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.error("❌ ERROR: Deployer is not the owner!");
            console.error(`   Owner: ${owner}`);
            console.error(`   Deployer: ${deployer.address}`);
            console.error("   Only the owner can upgrade the contract");
            process.exit(1);
        }
        console.log("✅ Deployer is the owner (can upgrade)");
    } catch (error: any) {
        console.warn("⚠️  Could not verify ownership:", error.message);
        console.warn("   Proceeding anyway, but upgrade may fail if not owner");
    }

    // Perform upgrade
    console.log("\n--- Upgrading CellarHook ---");
    console.log("Deploying new implementation...");
    console.log("\nThis upgrade includes:");
    console.log("  ✓ Price calculation fix (glaze-like behavior)");
    console.log("  ✓ Uses initPrice instead of paymentAmount for new epoch price");
    console.log("  ✓ Ensures price grows over time instead of oscillating");
    console.log("  ✓ Location: CellarHook.sol line 756");

    const CellarHookFactory = await ethers.getContractFactory("CellarHook");

    // Register existing proxy with upgrades plugin (required for storage layout validation)
    console.log("\n--- Registering Existing Proxy ---");
    try {
        await upgrades.forceImport(CELLAR_HOOK_PROXY, CellarHookFactory, { kind: 'uups' });
        console.log("✅ Existing proxy registered with upgrades plugin");
    } catch (error: any) {
        // If already registered, that's fine
        if (error.message && error.message.includes("already registered")) {
            console.log("✅ Proxy already registered");
        } else {
            console.warn("⚠️  Warning: Could not register proxy:", error.message);
            console.warn("   Continuing anyway - upgrade may still work");
        }
    }

    console.log("\n⚠️  IMPORTANT: This will upgrade the contract on", networkName);
    console.log("   Proxy address will remain:", CELLAR_HOOK_PROXY);
    console.log("   Only the implementation will change");
    console.log("\nProceeding with upgrade in 3 seconds...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    let upgradeTxHash: string | undefined;
    try {
        const cellarHook = await upgrades.upgradeProxy(CELLAR_HOOK_PROXY, CellarHookFactory);
        const deployTx = cellarHook.deploymentTransaction();
        if (deployTx) {
            upgradeTxHash = deployTx.hash;
            console.log("   Upgrade transaction hash:", upgradeTxHash);
        }
        await cellarHook.waitForDeployment();
    } catch (error: any) {
        console.error("❌ Upgrade transaction failed:", error.message);
        throw error;
    }

    const newHookImpl = await upgrades.erc1967.getImplementationAddress(CELLAR_HOOK_PROXY);

    console.log("\n✅ CellarHook Upgraded Successfully");
    console.log("   Proxy (unchanged):", CELLAR_HOOK_PROXY);
    console.log("   Old Implementation:", currentHookImpl);
    console.log("   New Implementation:", newHookImpl);

    if (currentHookImpl === newHookImpl) {
        console.warn("\n⚠️  WARNING: Implementation address unchanged");
        console.warn("   Old Implementation: " + currentHookImpl);
        console.warn("   New Implementation: " + newHookImpl);
        console.warn("\n   This means OpenZeppelin detected identical bytecode and reused the existing implementation.");
        console.warn("   This typically means the on-chain contract ALREADY HAS THIS FIX.");
        console.warn("\n   To verify:");
        console.warn("   1. Check if contract at " + currentHookImpl + " already uses initPrice");
        console.warn("   2. The source code at line 757 should be: slot0Cache.initPrice * priceMultiplier");
        console.warn("   3. If the fix is already deployed, no upgrade is needed!");
        if (upgradeTxHash) {
            console.warn("\n   Upgrade transaction hash:", upgradeTxHash);
            console.warn("   Check the transaction - it may have been a no-op");
        } else {
            console.warn("\n   No upgrade transaction was sent (OpenZeppelin optimized it away)");
        }
        console.warn("\n   ✅ If the fix is already on-chain, you're done!");
    } else {
        console.log("\n✅ Implementation address changed - upgrade successful");
        console.log("   Old Implementation: " + currentHookImpl);
        console.log("   New Implementation: " + newHookImpl);
        if (upgradeTxHash) {
            console.log("   Upgrade transaction:", upgradeTxHash);
        }
    }

    // Update Frontend Addresses
    console.log("\n--- Updating Frontend Addresses ---");
    try {
        await updateFrontendAddresses({
            THE_CELLAR: CELLAR_HOOK_PROXY,
            THE_CELLAR_IMPL: newHookImpl
        });
        console.log("✅ Frontend addresses updated in apps/web/lib/contracts/addresses.ts");
    } catch (error: any) {
        console.error("❌ ERROR: Could not update frontend addresses:", error.message);
        console.error("   Please update apps/web/lib/contracts/addresses.ts manually:");
        console.error(`   THE_CELLAR_IMPL: ${newHookImpl}`);
    }

    // Update Deployment Tracker
    console.log("\n--- Updating Deployment Tracker ---");
    try {
        await updateDeploymentTracker({
            CELLAR_HOOK: CELLAR_HOOK_PROXY
        });
        console.log("✅ Deployment tracker updated in DEPLOYMENT_TRACKER.md");
    } catch (error: any) {
        console.warn("⚠️  Warning: Could not update deployment tracker:", error.message);
        console.warn("   Please update DEPLOYMENT_TRACKER.md manually");
    }

    // Print summary
    console.log("\n============================================");
    console.log("UPGRADE COMPLETE");
    console.log("============================================");
    console.log("\nNetwork:", networkName);
    console.log("Upgraded Contract:");
    console.log("  CellarHook:");
    console.log(`    Proxy: ${CELLAR_HOOK_PROXY}`);
    console.log(`    Old Impl: ${currentHookImpl}`);
    console.log(`    New Impl: ${newHookImpl}`);

    console.log("\n=== CHANGE SUMMARY ===");
    console.log("Price Calculation Fix (Glaze-like behavior):");
    console.log("  - Changed raid() function to use initPrice instead of paymentAmount");
    console.log("  - New epoch price = previous epoch's initPrice * priceMultiplier");
    console.log("  - Result: Price grows over time instead of oscillating");
    console.log("  - Location: CellarHook.sol line 756");
    console.log("\nBefore:");
    console.log("  newInitPrice = paymentAmount * priceMultiplier");
    console.log("  (If raided at floor 1 MON → new price = 2 MON → decays to 1 → repeat)");
    console.log("\nAfter:");
    console.log("  newInitPrice = slot0Cache.initPrice * priceMultiplier");
    console.log("  (If epoch started at 10 MON → raided at 1 MON → new price = 20 MON → grows!)");

    console.log("\n=== NEXT STEPS ===");
    console.log("1. Verify upgrade on block explorer:");
    if (chainId === 143) {
        console.log(`   https://monadscan.com/address/${newHookImpl}`);
    } else {
        console.log(`   https://testnet.monadscan.com/address/${newHookImpl}`);
    }
    console.log("\n2. Test the upgrade:");
    console.log("   - Wait for current epoch to progress");
    console.log("   - Perform a raid at different price points");
    console.log("   - Verify new epoch starts at initPrice * 2 (not paymentAmount * 2)");
    console.log("\n3. Monitor price growth:");
    console.log("   - Price should grow over multiple epochs");
    console.log("   - Should not oscillate between floor and 2x floor");
    console.log("\n4. Update DEPLOYMENT_TRACKER.md with upgrade details:");
    console.log(`   - Add entry: ${newHookImpl}`);
    console.log(`   - Document: Price calculation fix (glaze-like behavior)`);
    console.log(`   - Date: ${new Date().toISOString().split('T')[0]}`);
}

main().catch((error) => {
    console.error("\n❌ Upgrade failed:", error);
    if (error instanceof Error) {
        console.error("   Message:", error.message);
        if (error.stack) {
            console.error("   Stack:", error.stack);
        }
    }
    process.exitCode = 1;
});

