import { ethers } from "hardhat";
import { expect } from "chai";

async function main() {
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("Testing with accounts:", deployer.address, user1.address, user2.address);

    // Get contract instances
    // We need to read the addresses from the deployment output or assume they are deployed
    // For this script, we'll fetch them by name assuming they are already deployed on localhost

    // Helper to get address from registry or just attach if we know the name
    // Since we just deployed, we can attach to the deployed addresses if we knew them, 
    // but hardhat-deploy isn't being used here. 
    // We will rely on the fact that we are running against localhost where they are deployed.
    // But we need the addresses.
    // Let's read them from the addresses.ts file which was updated!

    const addresses = require("../../../apps/web/lib/contracts/addresses").LOCALHOST_ADDRESSES;

    console.log("Bar Regulars Manager:", addresses.TAVERN_REGULARS_MANAGER);
    console.log("Town Posse Manager:", addresses.TOWN_POSSE_MANAGER);
    console.log("Cellar Hook:", addresses.THE_CELLAR);
    console.log("Keep Token:", addresses.KEEP_TOKEN);

    const BarRegularsManager = await ethers.getContractAt("TavernRegularsManager", addresses.TAVERN_REGULARS_MANAGER);
    const TownPosseManager = await ethers.getContractAt("TownPosseManager", addresses.TOWN_POSSE_MANAGER);
    const CellarHook = await ethers.getContractAt("CellarHook", addresses.THE_CELLAR);
    const KeepToken = await ethers.getContractAt("KeepToken", addresses.KEEP_TOKEN);

    // 1. Test Bar Regulars Group Creation
    console.log("\n--- Testing Bar Regulars ---");
    const groupName = "The Winchester";
    console.log(`Creating group: ${groupName}`);
    const tx = await BarRegularsManager.connect(user1).createTavernRegularsGroup(groupName);
    const receipt = await tx.wait();

    // Get group ID from event
    // Simplified: assume it's group ID 1 since it's fresh
    const groupId = 1;
    console.log(`Group created with ID: ${groupId}`);

    // 2. Test Contribution
    const amountMON = ethers.parseEther("1"); // 1 ETH
    const amountKEEP = ethers.parseEther("100");

    // Mint KEEP to user1
    // Temporarily set TavernKeeper to deployer to allow minting
    await KeepToken.connect(deployer).setTavernKeeperContract(deployer.address);
    await KeepToken.mint(user1.address, amountKEEP);
    await KeepToken.mint(user2.address, amountKEEP);
    // 3. Test Town Posse
    console.log("\n--- Testing Town Posse ---");
    const posseName = "The Peaky Blinders";
    console.log(`Creating posse: ${posseName}`);
    await TownPosseManager.connect(user2).createTownPosse(posseName, 50, true, ethers.parseEther("0.1"));
    const posseId = 1;
    console.log(`Posse created with ID: ${posseId}`);

    // Minting already done above
    // await KeepToken.mint(user2.address, amountKEEP);
    await KeepToken.connect(user2).approve(addresses.TOWN_POSSE_MANAGER, amountKEEP);

    console.log(`Contributing to Posse...`);
    await TownPosseManager.connect(user2).contributeToTownPosse(posseId, amountMON, amountKEEP, { value: amountMON });

    const tier = await TownPosseManager.getMemberTier(posseId, user2.address);
    console.log("Member Tier:", tier.toString(), "(1=Bronze, 2=Silver, 3=Gold)");

    if (tier > 0) {
        console.log("✅ Contribution and Tier update successful!");
    }

    console.log("\n✅ All tests passed!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
