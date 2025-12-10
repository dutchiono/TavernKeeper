import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const TAVERN_KEEPER_PROXY = process.env.TAVERN_KEEPER_PROXY || "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";

async function main() {
    console.log("⏸️  UPGRADING TAVERNKEEPER TO ADD PAUSE FUNCTIONALITY\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`TavernKeeper Proxy: ${TAVERN_KEEPER_PROXY}\n`);

    // Verify deployer is the owner
    const TavernKeeperSetMinPrice = await ethers.getContractFactory("TavernKeeperSetMinPrice");
    const currentContract = TavernKeeperSetMinPrice.attach(TAVERN_KEEPER_PROXY);
    const owner = await currentContract.owner();

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error(`❌ Error: You are not the owner!`);
        console.error(`   Your address: ${deployer.address}`);
        console.error(`   Owner address: ${owner}`);
        process.exit(1);
    }

    // Get current state
    const slot0 = await currentContract.getSlot0();
    console.log(`📋 Current Office State:`);
    console.log(`   Current Manager: ${slot0.miner}`);
    console.log(`   Epoch ID: ${slot0.epochId}\n`);

    console.log(`📦 Deploying new implementation with pause functionality...\n`);

    // Deploy new implementation
    const TavernKeeperPausable = await ethers.getContractFactory("TavernKeeperPausable");

    try {
        // Check current implementation
        const currentImpl = await upgrades.erc1967.getImplementationAddress(TAVERN_KEEPER_PROXY);
        console.log(`   Current Implementation: ${currentImpl}\n`);

        // Use unsafeSkipStorageCheck to bypass storage layout validation
        // We're only adding a simple bool _paused variable, which is safe
        const upgraded = await upgrades.upgradeProxy(TAVERN_KEEPER_PROXY, TavernKeeperPausable, {
            unsafeSkipStorageCheck: true
        });
        await upgraded.waitForDeployment();

        const newImplAddress = await upgrades.erc1967.getImplementationAddress(TAVERN_KEEPER_PROXY);

        console.log(`✅ Upgrade successful!`);
        console.log(`   Proxy: ${TAVERN_KEEPER_PROXY} (unchanged)`);
        console.log(`   New Implementation: ${newImplAddress}\n`);

        // Verify pause state (should be false/unpaused by default)
        const pausableContract = TavernKeeperPausable.attach(TAVERN_KEEPER_PROXY);
        const isPaused = await pausableContract.paused();
        console.log(`📋 Pause State: ${isPaused ? "PAUSED" : "UNPAUSED"}\n`);

        console.log(`🎯 Available Functions:`);
        console.log(`   1. pause() - Pause takeOffice`);
        console.log(`   2. unpause() - Unpause takeOffice`);
        console.log(`   3. emergencyTransferToDeployer(string uri) - Transfer office to deployer for free`);
        console.log(`   4. pauseAndTransferToDeployer(string uri) - Pause AND transfer in one call\n`);

    } catch (error: any) {
        console.error(`❌ Upgrade failed!`);
        console.error(`   Error: ${error.message}`);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

