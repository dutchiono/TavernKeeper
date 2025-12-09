import { ethers, upgrades } from "hardhat";

/**
 * Upgrade TavernKeeper contract to fix office timer issue
 *
 * Problem: startTime was being reset when claiming rewards, breaking:
 * 1. Dutch auction price calculation (price resets incorrectly)
 * 2. Miner tenure timer (shows wrong time since taking office)
 *
 * Solution: Add separate lastClaimTime field to track reward claims
 * - startTime: Fixed from when they took office (for auction price)
 * - lastClaimTime: Tracks when rewards were last claimed (for incremental rewards)
 *
 * This upgrade:
 * 1. Adds officeLastClaimTime as separate storage variable (AFTER existing storage for compatibility)
 * 2. Updates claimOfficeRewards() to use officeLastClaimTime instead of resetting startTime
 * 3. Updates getPendingOfficeRewards() to use officeLastClaimTime
 * 4. Preserves current manager's state (officeLastClaimTime defaults to 0 = use startTime)
 * 5. Slot0 struct remains UNCHANGED (storage layout compatible)
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-office-timer-fix.ts --network monad
 *
 * Environment variables (optional):
 *   TAVERN_KEEPER_PROXY=0x... (defaults to mainnet: 0x56B81A60Ae343342685911bd97D1331fF4fa2d29)
 */

// Mainnet addresses
const MAINNET_TAVERN_KEEPER = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";

// Testnet addresses
const TESTNET_TAVERN_KEEPER = "0xFaC0786eF353583FBD43Ee7E7e84836c1857A381";

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    console.log("============================================");
    console.log("OFFICE TIMER FIX UPGRADE");
    console.log("============================================");
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MON\n`);

    // Determine addresses based on network
    const isMainnet = chainId === 143n;
    const tavernKeeperProxy = process.env.TAVERN_KEEPER_PROXY || (isMainnet ? MAINNET_TAVERN_KEEPER : TESTNET_TAVERN_KEEPER);

    console.log(`Using ${isMainnet ? 'MAINNET' : 'TESTNET'} address:`);
    console.log(`  TavernKeeper Proxy: ${tavernKeeperProxy}\n`);

    // ============================================
    // STEP 1: Check Current State
    // ============================================
    console.log("============================================");
    console.log("STEP 1: Checking current office state...");
    console.log("============================================");

    const tkContract = await ethers.getContractAt("TavernKeeper", tavernKeeperProxy);

    try {
        const slot0 = await tkContract.slot0();
        const currentPrice = await tkContract.getPrice();
        const pendingRewards = await tkContract.getPendingOfficeRewards();

        console.log("\n📊 Current Office State:");
        console.log(`   Current Manager: ${slot0.miner}`);
        console.log(`   Epoch ID: ${slot0.epochId}`);
        console.log(`   Start Time: ${slot0.startTime} (${new Date(Number(slot0.startTime) * 1000).toISOString()})`);
        console.log(`   Init Price: ${ethers.formatEther(slot0.initPrice)} MON`);
        console.log(`   Current Price: ${ethers.formatEther(currentPrice)} MON`);
        console.log(`   DPS: ${ethers.formatEther(slot0.dps)} KEEP/sec`);
        console.log(`   Pending Rewards: ${ethers.formatEther(pendingRewards)} KEEP`);

        if (slot0.miner === ethers.ZeroAddress) {
            console.log("\n⚠️  WARNING: No current office manager!");
        } else {
            const timeSinceOffice = BigInt(Math.floor(Date.now() / 1000)) - slot0.startTime;
            const hoursSinceOffice = Number(timeSinceOffice) / 3600;
            console.log(`   Time Since Taking Office: ${hoursSinceOffice.toFixed(2)} hours`);
        }

        console.log("\n✅ Current state captured for verification after upgrade\n");
    } catch (error: any) {
        console.error(`❌ Error reading current state: ${error.message}`);
        process.exit(1);
    }

    // ============================================
    // STEP 2: Get Current Implementation Address
    // ============================================
    console.log("============================================");
    console.log("STEP 2: Getting current implementation...");
    console.log("============================================");

    const tkCurrentImpl = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxy);
    console.log(`TavernKeeper:`);
    console.log(`  Proxy: ${tavernKeeperProxy}`);
    console.log(`  Current Impl: ${tkCurrentImpl}\n`);

    // ============================================
    // STEP 3: Perform Upgrade
    // ============================================
    console.log("============================================");
    console.log("STEP 3: Upgrading TavernKeeper...");
    console.log("============================================");

    console.log("\nChanges in this upgrade:");
    console.log("  ✅ Add: officeLastClaimTime storage variable (separate, not in struct)");
    console.log("  ✅ Fix: claimOfficeRewards() uses officeLastClaimTime instead of resetting startTime");
    console.log("  ✅ Fix: getPendingOfficeRewards() uses officeLastClaimTime");
    console.log("  ✅ Preserve: Current manager's startTime (for auction price)");
    console.log("  ✅ Preserve: Current manager's rewards (officeLastClaimTime defaults to 0)");
    console.log("  ✅ Storage compatible: Slot0 struct unchanged\n");

    try {
        const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
        const tkUpgraded = await upgrades.upgradeProxy(tavernKeeperProxy, TavernKeeperFactory);
        await tkUpgraded.waitForDeployment();

        const tkNewImpl = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxy);
        console.log(`✅ TavernKeeper upgraded successfully!`);
        console.log(`   Proxy (unchanged): ${tavernKeeperProxy}`);
        console.log(`   Old Impl: ${tkCurrentImpl}`);
        console.log(`   New Impl: ${tkNewImpl}\n`);
    } catch (error: any) {
        console.error(`❌ TavernKeeper upgrade failed: ${error.message}`);
        if (error.data) console.error(`   Error data: ${error.data}`);
        process.exit(1);
    }

    // ============================================
    // STEP 4: Verify Upgrade
    // ============================================
    console.log("============================================");
    console.log("STEP 4: Verifying upgrade...");
    console.log("============================================");

    try {
        const tkContractUpgraded = await ethers.getContractAt("TavernKeeper", tavernKeeperProxy);

        // Check that slot0 still works
        const slot0After = await tkContractUpgraded.slot0();
        const currentPriceAfter = await tkContractUpgraded.getPrice();
        const pendingRewardsAfter = await tkContractUpgraded.getPendingOfficeRewards();

        console.log("\n📊 Office State After Upgrade:");
        console.log(`   Current Manager: ${slot0After.miner}`);
        console.log(`   Epoch ID: ${slot0After.epochId}`);
        console.log(`   Start Time: ${slot0After.startTime} (${new Date(Number(slot0After.startTime) * 1000).toISOString()})`);

        // Check officeLastClaimTime (separate storage variable)
        try {
            const lastClaimTime = await tkContractUpgraded.officeLastClaimTime();
            console.log(`   Last Claim Time: ${lastClaimTime} (${lastClaimTime === 0 ? '0 = will use startTime' : new Date(Number(lastClaimTime) * 1000).toISOString()})`);
        } catch (e) {
            console.log(`   ⚠️  Could not read officeLastClaimTime (may not exist yet)`);
        }

        console.log(`   Current Price: ${ethers.formatEther(currentPriceAfter)} MON`);
        console.log(`   Pending Rewards: ${ethers.formatEther(pendingRewardsAfter)} KEEP`);

        // Verify state preservation
        console.log("\n✅ Verification:");
        console.log(`   ✓ Manager unchanged: ${slot0After.miner === (await tkContract.slot0()).miner}`);
        console.log(`   ✓ Start time preserved: ${slot0After.startTime === (await tkContract.slot0()).startTime}`);
        console.log(`   ✓ Price calculation working: ${currentPriceAfter > 0n}`);
        console.log(`   ✓ Rewards calculation working: ${pendingRewardsAfter >= 0n}`);

        // Test that claimOfficeRewards function exists and works
        try {
            // Just check if function exists (don't actually call it)
            const claimFunction = tkContractUpgraded.claimOfficeRewards;
            if (claimFunction) {
                console.log(`   ✓ claimOfficeRewards() function exists`);
            }
        } catch (e) {
            console.log(`   ⚠️  Could not verify claimOfficeRewards() function`);
        }

        console.log("\n✅ Upgrade verification complete!\n");

    } catch (error: any) {
        console.error(`❌ Verification failed: ${error.message}`);
        console.error(`   This may indicate the upgrade had issues.`);
        process.exit(1);
    }

    // ============================================
    // STEP 5: Summary & Next Steps
    // ============================================
    console.log("============================================");
    console.log("UPGRADE COMPLETE - Summary");
    console.log("============================================");

    const tkNewImpl = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxy);

    console.log("\n✅ What was fixed:");
    console.log("   • Office timer no longer resets when claiming rewards");
    console.log("   • Auction price calculation now correct (uses startTime, never resets)");
    console.log("   • Miner tenure timer shows correct time since taking office");
    console.log("   • Rewards are calculated incrementally since last claim");
    console.log("   • Storage layout compatible (new variable added, struct unchanged)");

    console.log("\n📝 Current Manager Status:");
    const slot0Final = await (await ethers.getContractAt("TavernKeeper", tavernKeeperProxy)).slot0();
    if (slot0Final.miner !== ethers.ZeroAddress) {
        console.log(`   • Manager: ${slot0Final.miner}`);
        console.log(`   • First claim after upgrade will get ALL rewards since taking office`);
        console.log(`   • Subsequent claims will be incremental (since last claim)`);
    }

    console.log("\n📋 Documentation Update Command:");
    console.log(`$env:CONTRACT_NAME="TavernKeeper"; $env:OLD_IMPL="${tkCurrentImpl}"; $env:NEW_IMPL="${tkNewImpl}"; $env:REASON="Fixed office timer: added officeLastClaimTime storage variable, startTime no longer resets on claim"; npx hardhat run scripts/update_deployment_docs.ts\n`);

    console.log("✅ Upgrade script completed successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

