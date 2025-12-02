import fs from "fs";
import { ethers, upgrades } from "hardhat";
import path from "path";
import { updateFrontendAddresses } from "./updateFrontend";

/**
 * Deploys CellarHook as UUPS upgradeable proxy
 * This fixes the potBalance bug and makes the contract upgradeable
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== DEPLOYING CELLARHOOK AS UUPS PROXY ===");
    console.log("Deployer:", deployer.address);
    console.log("");

    // Load deployment info
    const infoPath = path.join(__dirname, "../deployment-info-v4.json");
    if (!fs.existsSync(infoPath)) {
        console.error("Error: deployment-info-v4.json not found.");
        process.exit(1);
    }
    const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));

    const PoolManager = info.contracts.poolManager;
    const KeepToken = info.contracts.keepToken;
    const TavernKeeperProxy = process.env.TAVERN_KEEPER_PROXY || "0x311d8722A5cE11DF157D7a9d414bbeC2640c5Fb2";
    const oldCellarHook = "0x41ceC2cE651D37830af8FD94a35d23d428F80aC0";

    if (!PoolManager || !KeepToken) {
        console.error("Missing dependencies in deployment-info-v4.json");
        console.error("Required: poolManager, keepToken");
        process.exit(1);
    }

    console.log("Deployment Parameters:");
    console.log("  PoolManager:", PoolManager);
    console.log("  KeepToken:", KeepToken);
    console.log("  TavernKeeper Proxy:", TavernKeeperProxy);
    console.log("  Old CellarHook:", oldCellarHook);
    console.log("");

    // Constructor parameters (now initialize parameters)
    const initPrice = ethers.parseEther("100");
    const epochPeriod = 3600; // 1 hour
    const priceMultiplier = ethers.parseEther("1.1"); // 110%
    const minInitPrice = ethers.parseEther("1"); // 1 MON
    const MON = "0x0000000000000000000000000000000000000000"; // Native

    console.log("--- Step 1: Deploying CellarHook Implementation ---");
    const CellarHook = await ethers.getContractFactory("CellarHook");
    const implementation = await CellarHook.deploy();
    await implementation.waitForDeployment();
    const implAddress = await implementation.getAddress();
    console.log("✓ Implementation deployed:", implAddress);
    console.log("");

    console.log("--- Step 2: Deploying UUPS Proxy ---");
    const proxy = await upgrades.deployProxy(
        CellarHook,
        [
            PoolManager,
            MON,
            KeepToken,
            initPrice,
            epochPeriod,
            priceMultiplier,
            minInitPrice,
            deployer.address // owner
        ],
        {
            kind: 'uups',
            initializer: 'initialize'
        }
    );
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    console.log("✓ Proxy deployed:", proxyAddress);
    console.log("");

    console.log("--- Step 3: Verifying Deployment ---");
    const cellarHook = await ethers.getContractAt("CellarHook", proxyAddress);
    const potBalance = await cellarHook.potBalance();
    const slot0 = await cellarHook.slot0();
    const poolManagerCheck = await cellarHook.poolManager();
    console.log("✓ Contract verified:");
    console.log("  potBalance:", ethers.formatEther(potBalance), "MON");
    console.log("  epochId:", slot0.epochId.toString());
    console.log("  initPrice:", ethers.formatEther(slot0.initPrice), "MON");
    console.log("  poolManager:", poolManagerCheck);
    console.log("");

    console.log("--- Step 4: Updating TavernKeeper Treasury ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(TavernKeeperProxy);
    const currentTreasury = await tavernKeeper.treasury();
    console.log("Current treasury:", currentTreasury);
    console.log("New treasury:", proxyAddress);

    if (currentTreasury.toLowerCase() === proxyAddress.toLowerCase()) {
        console.log("✓ Treasury already set to new address");
    } else {
        console.log("Updating treasury address...");
        const setTreasuryTx = await tavernKeeper.setTreasury(proxyAddress);
        await setTreasuryTx.wait();
        console.log("✓ Treasury updated!");
        console.log("  Transaction:", setTreasuryTx.hash);
    }
    console.log("");

    console.log("--- Step 5: Updating Addresses ---");
    info.contracts.cellarHook = proxyAddress;
    info.contracts.cellarHookImpl = implAddress;
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
    console.log("✓ Updated deployment-info-v4.json");

    updateFrontendAddresses({ THE_CELLAR: proxyAddress });
    console.log("✓ Updated frontend addresses");
    console.log("");

    console.log("============================================");
    console.log("DEPLOYMENT COMPLETE!");
    console.log("============================================");
    console.log("CellarHook Proxy:", proxyAddress);
    console.log("CellarHook Implementation:", implAddress);
    console.log("Old CellarHook:", oldCellarHook);
    console.log("");
    console.log("⚠️  IMPORTANT NOTES:");
    console.log("  1. The old CellarHook still exists at:", oldCellarHook);
    console.log("  2. It contains ~0.15 MON that won't be tracked by potBalance");
    console.log("  3. All new funds will go to the new CellarHook");
    console.log("  4. Please update DEPLOYMENT_TRACKER.md with the new addresses");
    console.log("  5. The contract is now upgradeable via UUPS proxy");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
