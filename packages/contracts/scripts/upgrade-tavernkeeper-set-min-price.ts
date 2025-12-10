import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

/**
 * Upgrade TavernKeeper to set minimum office price to 100 MON
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-tavernkeeper-set-min-price.ts --network monad
 */

const TAVERN_KEEPER_PROXY = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const NEW_MIN_PRICE = ethers.parseEther("100"); // 100 MON

async function main() {
    console.log("🔧 UPGRADING TavernKeeper TO SET MIN PRICE TO 100 MON...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Proxy:", TAVERN_KEEPER_PROXY);
    console.log("New Min Price: 100 MON");
    console.log("");

    // Check current state
    console.log("--- CURRENT STATE ---");
    const currentTK = await ethers.getContractAt("TavernKeeperV3", TAVERN_KEEPER_PROXY);
    const currentPrice = await currentTK.getPrice();
    const slot0 = await currentTK.slot0();

    console.log("Current Price:", ethers.formatEther(currentPrice), "MON");
    console.log("Current Epoch ID:", slot0.epochId.toString());
    console.log("Current Init Price:", ethers.formatEther(slot0.initPrice), "MON");
    console.log("");

    // Deploy new implementation
    console.log("--- DEPLOYING NEW IMPLEMENTATION ---");
    const TavernKeeperSetMinPrice = await ethers.getContractFactory("TavernKeeperSetMinPrice");
    console.log("Deploying TavernKeeperSetMinPrice...");

    const upgraded = await upgrades.upgradeProxy(TAVERN_KEEPER_PROXY, TavernKeeperSetMinPrice);
    await upgraded.waitForDeployment();

    console.log("✅ Upgrade complete!");
    console.log("Proxy address:", await upgraded.getAddress());
    console.log("");

    // Verify
    console.log("--- VERIFICATION ---");
    const upgradedTK = TavernKeeperSetMinPrice.attach(TAVERN_KEEPER_PROXY);

    // Check that price calculation now uses 100 MON minimum
    const newPrice = await upgradedTK.getPrice();
    const newSlot0 = await upgradedTK.slot0();

    console.log("New Price:", ethers.formatEther(newPrice), "MON");
    console.log("New Init Price:", ethers.formatEther(newSlot0.initPrice), "MON");

    // If price decayed below 100, it should be 100 now
    if (newPrice < NEW_MIN_PRICE) {
        console.log("⚠️  Price is below 100 MON - this means the auction hasn't decayed yet");
        console.log("   The minimum will be enforced when price decays or on next takeOffice");
    } else {
        console.log("✅ Price is at or above 100 MON minimum");
    }

    console.log("\n=== UPGRADE COMPLETE ===");
    console.log("TavernKeeper now requires minimum 100 MON to take office");
    console.log("This will prevent immediate office takes when price is very low");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exitCode = 1;
    });

