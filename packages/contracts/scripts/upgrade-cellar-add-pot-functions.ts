import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

async function main() {
    console.log("🔧 UPGRADING TheCellarV3 TO ADD POT FUNCTIONS...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Deploy new implementation
    console.log("📦 Deploying TheCellarV3Upgrade implementation...");
    const TheCellarV3Upgrade = await ethers.getContractFactory("TheCellarV3Upgrade");

    // Upgrade the proxy
    console.log("⬆️  Upgrading proxy to new implementation...");
    const upgraded = await upgrades.upgradeProxy(CELLAR_V3_PROXY, TheCellarV3Upgrade);
    await upgraded.waitForDeployment();

    console.log("\n✅ TheCellarV3 upgraded successfully!");
    console.log(`Proxy Address: ${CELLAR_V3_PROXY}`);
    console.log(`New Implementation: ${await upgrades.erc1967.getImplementationAddress(CELLAR_V3_PROXY)}`);
    console.log("\n📝 New functions added:");
    console.log("   - receive() - Accepts office fees, wraps MON to WMON, adds to pot");
    console.log("   - sweetenPot() - Manual function to add MON to pot");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

