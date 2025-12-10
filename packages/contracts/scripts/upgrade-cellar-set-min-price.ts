import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

/**
 * Upgrade TheCellarV3 to set minimum raid price to 100 CLP
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-cellar-set-min-price.ts --network monad
 */

const CELLAR_V3_PROXY = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const NEW_MIN_INIT_PRICE = ethers.parseEther("100"); // 100 CLP

async function main() {
    console.log("🔧 UPGRADING TheCellarV3 TO SET MIN PRICE TO 100 CLP...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Proxy:", CELLAR_V3_PROXY);
    console.log("New Min Init Price:", ethers.formatEther(NEW_MIN_INIT_PRICE), "CLP");
    console.log("");

    // Check current state
    console.log("--- CURRENT STATE ---");
    const currentCellar = await ethers.getContractAt("TheCellarV3", CELLAR_V3_PROXY);
    const currentMinPrice = await currentCellar.minInitPrice();
    const currentPotMON = await currentCellar.potBalanceMON();
    const currentPotKEEP = await currentCellar.potBalanceKEEP();

    console.log("Current minInitPrice:", ethers.formatEther(currentMinPrice), "CLP");
    console.log("Current Pot MON:", ethers.formatEther(currentPotMON), "MON");
    console.log("Current Pot KEEP:", ethers.formatEther(currentPotKEEP), "KEEP");
    console.log("");

    // Deploy new implementation
    console.log("--- DEPLOYING NEW IMPLEMENTATION ---");
    const TheCellarV3SetMinPrice = await ethers.getContractFactory("TheCellarV3SetMinPrice");
    console.log("Deploying TheCellarV3SetMinPrice...");

    const upgraded = await upgrades.upgradeProxy(CELLAR_V3_PROXY, TheCellarV3SetMinPrice);
    await upgraded.waitForDeployment();

    console.log("✅ Upgrade complete!");
    console.log("Proxy address:", await upgraded.getAddress());
    console.log("");

    // Set the new min price
    console.log("--- SETTING NEW MIN PRICE ---");
    const upgradedCellar = TheCellarV3SetMinPrice.attach(CELLAR_V3_PROXY);

    console.log("Calling setMinInitPrice(", ethers.formatEther(NEW_MIN_INIT_PRICE), "CLP)...");
    const setMinTx = await upgradedCellar.setMinInitPrice(NEW_MIN_INIT_PRICE);
    console.log("Transaction hash:", setMinTx.hash);
    await setMinTx.wait();
    console.log("✅ Min price set!");
    console.log("");

    // Verify
    console.log("--- VERIFICATION ---");
    const newMinPrice = await upgradedCellar.minInitPrice();
    console.log("New minInitPrice:", ethers.formatEther(newMinPrice), "CLP");

    if (newMinPrice === NEW_MIN_INIT_PRICE) {
        console.log("✅ SUCCESS: Min price is now 100 CLP");
    } else {
        console.log("❌ ERROR: Min price mismatch!");
    }

    // Check pot is still intact
    const newPotMON = await upgradedCellar.potBalanceMON();
    const newPotKEEP = await upgradedCellar.potBalanceKEEP();
    console.log("Pot MON after upgrade:", ethers.formatEther(newPotMON), "MON");
    console.log("Pot KEEP after upgrade:", ethers.formatEther(newPotKEEP), "KEEP");

    if (newPotMON === currentPotMON && newPotKEEP === currentPotKEEP) {
        console.log("✅ Pot balances preserved");
    } else {
        console.log("⚠️  Pot balances changed during upgrade");
    }

    console.log("\n=== UPGRADE COMPLETE ===");
    console.log("TheCellarV3 now requires minimum 100 CLP to raid");
    console.log("This will prevent immediate raids when fees are deposited");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exitCode = 1;
    });

