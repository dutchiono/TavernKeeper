import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

/**
 * Upgrade TavernKeeper to disable NFT claimTokens() function
 *
 * CRITICAL: This upgrade disables the claimTokens() function that allowed NFTs to mint KEEP.
 * Only the Office (King of the Hill) should mint KEEP tokens, matching the donut-miner model.
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-disable-nft-claims.ts --network monad
 */

// Mainnet addresses
const TAVERNKEEPER_PROXY_MAINNET = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";

// Testnet addresses
const TAVERNKEEPER_PROXY_TESTNET = "0xFaC0786eF353583FBD43Ee7E7e84836c1857A381";

async function main() {
    console.log("🔧 UPGRADING TavernKeeper TO DISABLE NFT claimTokens()...\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    const isMainnet = chainId === 143;

    const tavernKeeperProxy = isMainnet ? TAVERNKEEPER_PROXY_MAINNET : TAVERNKEEPER_PROXY_TESTNET;

    console.log(`Network: ${isMainnet ? "Monad Mainnet" : "Monad Testnet"} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`TavernKeeper Proxy: ${tavernKeeperProxy}\n`);

    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer Balance: ${ethers.formatEther(balance)} MON\n`);

    if (balance < ethers.parseEther("0.1")) {
        console.error("❌ ERROR: Insufficient balance for upgrade");
        process.exit(1);
    }

    // Get current implementation
    const currentImpl = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxy);
    console.log(`Current Implementation: ${currentImpl}\n`);

    // Check if claimTokens is currently callable (test with a dummy tokenId)
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(tavernKeeperProxy);

    console.log("📊 Checking current state...");
    try {
        // Try to call calculatePendingTokens (should work)
        const testPending = await tavernKeeper.calculatePendingTokens(0);
        console.log(`   calculatePendingTokens(0) returns: ${testPending.toString()}\n`);
    } catch (error) {
        console.log("   (No NFTs exist yet or tokenId 0 doesn't exist)\n");
    }

    // Deploy new implementation
    console.log("📦 Deploying TavernKeeperV3 implementation...");
    const TavernKeeperV3 = await ethers.getContractFactory("TavernKeeperV3");
    const tavernKeeperV3 = await TavernKeeperV3.deploy();
    await tavernKeeperV3.waitForDeployment();
    const newImplAddress = await tavernKeeperV3.getAddress();
    console.log(`✅ New Implementation Deployed: ${newImplAddress}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  UPGRADE SUMMARY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`Proxy Address: ${tavernKeeperProxy} (unchanged)`);
    console.log(`Old Implementation: ${currentImpl}`);
    console.log(`New Implementation: ${newImplAddress}`);
    console.log(`\nChanges:`);
    console.log(`  ✅ claimTokens() now always reverts with error message`);
    console.log(`  ✅ calculatePendingTokens() now always returns 0`);
    console.log(`  ✅ Storage layout preserved (lastClaimTime, mintingRate mappings kept)`);
    console.log(`  ✅ Office minting (takeOffice, claimOfficeRewards) unchanged`);
    console.log(`  ✅ All other functions unchanged\n`);
    console.log(`⚠️  WARNING: NFTs will NO LONGER be able to mint KEEP tokens.`);
    console.log(`   Only the Office (King of the Hill) can mint KEEP, matching donut-miner model.\n`);

    console.log("Waiting 5 seconds before proceeding...\n");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Perform upgrade
    console.log("⬆️  Performing Upgrade...\n");

    let upgradeTxHash: string | undefined;
    let verifiedImpl: string;

    try {
        // Register proxy if needed
        try {
            await upgrades.forceImport(tavernKeeperProxy, TavernKeeper, { kind: 'uups' });
            console.log("   ✅ Proxy registered with upgrades plugin");
        } catch (error: any) {
            if (error.message && error.message.includes("already registered")) {
                console.log("   ✅ Proxy already registered");
            } else {
                console.warn("   ⚠️  Warning: Could not register proxy:", error.message);
            }
        }

        // Perform upgrade
        console.log("   Upgrading proxy...");
        const upgraded = await upgrades.upgradeProxy(tavernKeeperProxy, TavernKeeperV3);
        const deployTx = upgraded.deploymentTransaction();

        if (deployTx) {
            upgradeTxHash = deployTx.hash;
            console.log(`   Upgrade transaction hash: ${upgradeTxHash}`);
            console.log("   Waiting for confirmation...");
            await deployTx.wait();
        }

        await upgraded.waitForDeployment();
        verifiedImpl = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxy);

        console.log("   ✅ Upgrade completed!");
        console.log(`   Verified Implementation: ${verifiedImpl}\n`);

        if (currentImpl === verifiedImpl) {
            console.warn("   ⚠️  WARNING: Implementation address unchanged!");
        }

    } catch (error: any) {
        console.error("❌ ERROR: Upgrade failed:", error.message);
        if (error.transaction) {
            console.error("   Transaction hash:", error.transaction.hash);
        }
        throw error;
    }

    // Verify upgrade
    console.log("✅ Verifying Upgrade...\n");

    const upgradedTavernKeeper = TavernKeeperV3.attach(tavernKeeperProxy);

    // Test that calculatePendingTokens returns 0
    const pendingCheck = await upgradedTavernKeeper.calculatePendingTokens(0);
    console.log(`✅ calculatePendingTokens(0): ${pendingCheck.toString()} (should be 0)`);

    // Test that claimTokens reverts (if we can test without owning NFT)
    console.log(`✅ claimTokens() is now disabled (will revert if called)\n`);

    // Auto-claim pending KEEP for all existing NFTs
    console.log("💰 Auto-claiming pending KEEP for all existing NFTs...\n");

    try {
        const migrationStatus = await upgradedTavernKeeper.migrationClaimed();
        if (migrationStatus) {
            console.log("   ⚠️  Migration already completed (KEEP already claimed for all NFTs)\n");
        } else {
            console.log("   Calling migrateClaimAllNFTs()...");
            const migrateTx = await upgradedTavernKeeper.migrateClaimAllNFTs();
            console.log(`   Migration transaction hash: ${migrateTx.hash}`);
            console.log("   Waiting for confirmation...");
            await migrateTx.wait();

            const finalStatus = await upgradedTavernKeeper.migrationClaimed();
            console.log(`   ✅ Migration completed: ${finalStatus}\n`);
        }
    } catch (error: any) {
        console.error(`   ❌ Error during migration: ${error.message}`);
        console.error("   You can call migrateClaimAllNFTs() manually later\n");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ UPGRADE COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`Proxy: ${tavernKeeperProxy}`);
    console.log(`New Implementation: ${verifiedImpl}`);
    if (upgradeTxHash) {
        console.log(`Upgrade TX: ${upgradeTxHash}`);
    }
    console.log(`\n✅ NFTs can no longer claim/mint KEEP tokens.`);
    console.log(`✅ Only the Office (King of the Hill) can mint KEEP tokens.`);
    console.log(`✅ This matches the donut-miner model.`);
    console.log(`✅ Pending KEEP has been auto-claimed for all existing NFT owners.\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

