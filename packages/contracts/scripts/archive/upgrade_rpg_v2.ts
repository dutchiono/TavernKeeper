import { ethers, upgrades } from "hardhat";
import fs from 'fs';
import path from 'path';

async function main() {
    const deploymentPath = path.join(__dirname, '../DEPLOYMENT_TRACKER.md');
    const deploymentContent = fs.readFileSync(deploymentPath, 'utf-8');

    // Hardcoded Proxy Addresses from DEPLOYMENT_TRACKER.md
    const tavernKeeperProxy = "0x311d8722A5cE11DF157D7a9d414bbeC2640c5Fb2";
    const adventurerProxy = "0x67e27a22B64385e0110e69Dceae7d394D2C87B06";

    console.log(`Upgrading TavernKeeper at ${tavernKeeperProxy}...`);
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = await upgrades.upgradeProxy(tavernKeeperProxy, TavernKeeper, { unsafeAllow: ['storage-layout', 'constructor'] });
    await tavernKeeper.waitForDeployment();
    console.log("TavernKeeper upgraded");

    console.log(`Upgrading Adventurer at ${adventurerProxy}...`);
    const Adventurer = await ethers.getContractFactory("Adventurer");
    const adventurer = await upgrades.upgradeProxy(adventurerProxy, Adventurer, { unsafeAllow: ['storage-layout', 'constructor'] });
    await adventurer.waitForDeployment();
    console.log("Adventurer upgraded");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
