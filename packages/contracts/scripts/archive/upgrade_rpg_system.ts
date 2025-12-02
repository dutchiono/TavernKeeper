import { ethers, upgrades } from "hardhat";
import { updateDeploymentTracker } from "./updateDeploymentTracker";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading RPG System contracts with account:", deployer.address);

    // Addresses from DEPLOYMENT_TRACKER.md
    const TAVERN_KEEPER_PROXY = "0x311d8722A5cE11DF157D7a9d414bbeC2640c5Fb2";
    const ADVENTURER_PROXY = "0x67e27a22B64385e0110e69Dceae7d394D2C87B06";
    const ERC6551_REGISTRY = "0xF53245E95FAc1286b42Fd2231018fd8e62c4B126";
    const ERC6551_ACCOUNT_IMPL = "0x13400f8A9E3Cc2b973538acB6527E3425D2AaF6c";

    // 1. Upgrade TavernKeeper
    console.log("Upgrading TavernKeeper...");
    const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = await upgrades.upgradeProxy(TAVERN_KEEPER_PROXY, TavernKeeperFactory, {
        call: { fn: 'initializeRPG', args: [] }
    });
    await tavernKeeper.waitForDeployment();
    console.log("TavernKeeper upgraded and initialized");

    // 2. Upgrade Adventurer
    console.log("Upgrading Adventurer...");
    const AdventurerFactory = await ethers.getContractFactory("Adventurer");
    const adventurer = await upgrades.upgradeProxy(ADVENTURER_PROXY, AdventurerFactory, {
        call: { fn: 'initializeRPG', args: [] }
    });
    await adventurer.waitForDeployment();
    console.log("Adventurer upgraded and initialized");

    // 3. Configure Adventurer
    console.log("Configuring Adventurer...");
    // We need to cast the proxy address to the new interface to call new functions
    const adventurerContract = await ethers.getContractAt("Adventurer", ADVENTURER_PROXY);

    const tx = await adventurerContract.setContracts(
        TAVERN_KEEPER_PROXY,
        ERC6551_REGISTRY,
        ERC6551_ACCOUNT_IMPL
    );
    await tx.wait();
    console.log("Adventurer configured with RPG contracts");

    // 4. Update Deployment Tracker (Updates implementation addresses)
    // We need to get the new implementation addresses
    const tavernKeeperImpl = await upgrades.erc1967.getImplementationAddress(TAVERN_KEEPER_PROXY);
    const adventurerImpl = await upgrades.erc1967.getImplementationAddress(ADVENTURER_PROXY);

    console.log("New TavernKeeper Implementation:", tavernKeeperImpl);
    console.log("New Adventurer Implementation:", adventurerImpl);

    await updateDeploymentTracker("TavernKeeper", TAVERN_KEEPER_PROXY, tavernKeeperImpl, "Proxy");
    await updateDeploymentTracker("Adventurer", ADVENTURER_PROXY, adventurerImpl, "Proxy");

    console.log("RPG System Upgrade Complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
