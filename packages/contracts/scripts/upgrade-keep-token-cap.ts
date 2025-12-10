import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

/**
 * Upgrade KeepToken to add 4 billion MAX_SUPPLY cap
 *
 * CRITICAL: This upgrade adds a maximum supply cap of 4 billion KEEP tokens.
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-keep-token-cap.ts --network monad
 */

// Mainnet addresses
const KEEP_TOKEN_PROXY_MAINNET = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

// Testnet addresses
const KEEP_TOKEN_PROXY_TESTNET = "0x96982EC3625145f098DCe06aB34E99E7207b0520";

async function main() {
    console.log("🔧 UPGRADING KeepToken TO ADD 4 BILLION MAX_SUPPLY CAP...\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    const isMainnet = chainId === 143;

    const keepTokenProxy = isMainnet ? KEEP_TOKEN_PROXY_MAINNET : KEEP_TOKEN_PROXY_TESTNET;

    console.log(`Network: ${isMainnet ? "Monad Mainnet" : "Monad Testnet"} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`KeepToken Proxy: ${keepTokenProxy}\n`);

    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer Balance: ${ethers.formatEther(balance)} MON\n`);

    if (balance < ethers.parseEther("0.1")) {
        console.error("❌ ERROR: Insufficient balance for upgrade");
        process.exit(1);
    }

    // Get current implementation
    const currentImpl = await upgrades.erc1967.getImplementationAddress(keepTokenProxy);
    console.log(`Current Implementation: ${currentImpl}\n`);

    // Get current total supply
    const KeepToken = await ethers.getContractFactory("KeepToken");
    const keepToken = KeepToken.attach(keepTokenProxy);
    const currentSupply = await keepToken.totalSupply();
    const decimals = await keepToken.decimals();
    const currentSupplyFormatted = ethers.formatUnits(currentSupply, decimals);
    console.log(`Current Total Supply: ${currentSupplyFormatted} KEEP\n`);

    // Deploy new implementation
    console.log("📦 Deploying KeepTokenV2 implementation...");
    const KeepTokenV2 = await ethers.getContractFactory("KeepTokenV2");
    const keepTokenV2 = await KeepTokenV2.deploy();
    await keepTokenV2.waitForDeployment();
    const newImplAddress = await keepTokenV2.getAddress();
    console.log(`✅ New Implementation Deployed: ${newImplAddress}\n`);

    // Verify MAX_SUPPLY constant
    const maxSupply = await keepTokenV2.MAX_SUPPLY();
    const maxSupplyFormatted = ethers.formatUnits(maxSupply, decimals);
    console.log(`MAX_SUPPLY: ${maxSupplyFormatted} KEEP (4 billion)\n`);

    // Check if current supply exceeds max
    if (currentSupply > maxSupply) {
        console.error(`❌ ERROR: Current supply (${currentSupplyFormatted} KEEP) exceeds MAX_SUPPLY (${maxSupplyFormatted} KEEP)`);
        console.error("   Cannot upgrade - supply already exceeds cap!");
        process.exit(1);
    }

    const remaining = maxSupply - currentSupply;
    const remainingFormatted = ethers.formatUnits(remaining, decimals);
    console.log(`Remaining Mintable: ${remainingFormatted} KEEP\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  UPGRADE SUMMARY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`Proxy Address: ${keepTokenProxy} (unchanged)`);
    console.log(`Old Implementation: ${currentImpl}`);
    console.log(`New Implementation: ${newImplAddress}`);
    console.log(`\nChanges:`);
    console.log(`  ✅ Added MAX_SUPPLY constant: 4,000,000,000 KEEP`);
    console.log(`  ✅ Added max supply check in mint() function`);
    console.log(`  ✅ Added getMaxSupply() view function`);
    console.log(`  ✅ Added getRemainingSupply() view function`);
    console.log(`\nCurrent Supply: ${currentSupplyFormatted} KEEP`);
    console.log(`Max Supply: ${maxSupplyFormatted} KEEP`);
    console.log(`Remaining: ${remainingFormatted} KEEP\n`);

    console.log("Waiting 5 seconds before proceeding...\n");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Perform upgrade
    console.log("⬆️  Performing Upgrade...\n");

    let upgradeTxHash: string | undefined;
    let verifiedImpl: string;

    try {
        // Register proxy if needed
        try {
            await upgrades.forceImport(keepTokenProxy, KeepToken, { kind: 'uups' });
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
        const upgraded = await upgrades.upgradeProxy(keepTokenProxy, KeepTokenV2);
        const deployTx = upgraded.deploymentTransaction();

        if (deployTx) {
            upgradeTxHash = deployTx.hash;
            console.log(`   Upgrade transaction hash: ${upgradeTxHash}`);
            console.log("   Waiting for confirmation...");
            await deployTx.wait();
        }

        await upgraded.waitForDeployment();
        verifiedImpl = await upgrades.erc1967.getImplementationAddress(keepTokenProxy);

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

    const upgradedKeepToken = KeepTokenV2.attach(keepTokenProxy);

    const maxSupplyCheck = await upgradedKeepToken.MAX_SUPPLY();
    const remainingCheck = await upgradedKeepToken.getRemainingSupply();

    console.log(`✅ MAX_SUPPLY: ${ethers.formatUnits(maxSupplyCheck, decimals)} KEEP`);
    console.log(`✅ Remaining Supply: ${ethers.formatUnits(remainingCheck, decimals)} KEEP`);
    console.log(`✅ Total Supply: ${ethers.formatUnits(await upgradedKeepToken.totalSupply(), decimals)} KEEP\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ UPGRADE COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`Proxy: ${keepTokenProxy}`);
    console.log(`New Implementation: ${verifiedImpl}`);
    if (upgradeTxHash) {
        console.log(`Upgrade TX: ${upgradeTxHash}`);
    }
    console.log(`\n✅ KeepToken now has a maximum supply cap of 4 billion KEEP tokens.`);
    console.log(`✅ All future mints will be checked against this cap.\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

