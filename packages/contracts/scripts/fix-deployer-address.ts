import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3_PROXY = process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS || "";

async function main() {
    console.log("🔧 FIXING DEPLOYER ADDRESS ON THE CELLAR V3\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    const deployerAddress = DEPLOYER_ADDRESS || deployer.address;

    if (!deployerAddress || deployerAddress === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Error: DEPLOYER_ADDRESS not set!");
        console.error("   Set DEPLOYER_ADDRESS in .env or use deployer.address");
        process.exit(1);
    }

    console.log(`Target deployerAddress: ${deployerAddress}\n`);

    // Check current state
    const CellarABI = [
        'function owner() view returns (address)',
        'function deployerAddress() view returns (address)',
    ];
    const cellar = new ethers.Contract(THE_CELLAR_V3_PROXY, CellarABI, deployer);

    const owner = await cellar.owner();
    const currentDeployerAddress = await cellar.deployerAddress();

    console.log(`📋 Current State:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Current deployerAddress: ${currentDeployerAddress}\n`);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error(`❌ Error: You are not the owner!`);
        console.error(`   Your address: ${deployer.address}`);
        console.error(`   Owner address: ${owner}`);
        process.exit(1);
    }

    if (currentDeployerAddress.toLowerCase() === deployerAddress.toLowerCase()) {
        console.log(`✅ deployerAddress is already set to ${deployerAddress}`);
        console.log(`   No fix needed.`);
        process.exit(0);
    }

    // Upgrade contract to add setDeployerAddress function
    console.log(`📦 Upgrading contract to add setDeployerAddress function...\n`);

    const TheCellarV3SetDeployer = await ethers.getContractFactory("TheCellarV3SetDeployer");

    console.log(`Upgrading proxy: ${THE_CELLAR_V3_PROXY}`);
    const upgraded = await upgrades.upgradeProxy(THE_CELLAR_V3_PROXY, TheCellarV3SetDeployer);
    await upgraded.waitForDeployment();

    console.log(`✅ Contract upgraded!\n`);

    // Now set the deployer address
    const SetDeployerABI = [
        'function setDeployerAddress(address)',
        'function deployerAddress() view returns (address)',
    ];
    const cellarWithSetter = new ethers.Contract(THE_CELLAR_V3_PROXY, SetDeployerABI, deployer);

    console.log(`🚀 Setting deployerAddress to ${deployerAddress}...`);
    try {
        const tx = await cellarWithSetter.setDeployerAddress(deployerAddress);
        console.log(`   Transaction hash: ${tx.hash}`);
        console.log(`   Waiting for confirmation...`);

        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}\n`);

        // Verify
        const newDeployerAddress = await cellarWithSetter.deployerAddress();
        console.log(`✅ deployerAddress set successfully!`);
        console.log(`   New deployerAddress: ${newDeployerAddress}\n`);

        if (newDeployerAddress.toLowerCase() === deployerAddress.toLowerCase()) {
            console.log(`🎉 Success! You can now use harvest-fees.ts to collect fees.`);
        } else {
            console.log(`⚠️  Warning: Address mismatch!`);
            console.log(`   Expected: ${deployerAddress}`);
            console.log(`   Got: ${newDeployerAddress}`);
        }

    } catch (error: any) {
        console.error(`❌ Failed to set deployerAddress:`, error.message);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

