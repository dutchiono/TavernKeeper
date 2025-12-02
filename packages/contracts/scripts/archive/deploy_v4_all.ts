import { ethers, upgrades } from "hardhat";
import { updateDeploymentTracker } from "./updateDeploymentTracker";
import { updateFrontendAddresses } from "./updateFrontend";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== DEPLOYING UNISWAP V4 SYSTEM (UUPS) ===");
    console.log("Deployer:", deployer.address);

    // 1. Deploy PoolManager
    console.log("\n--- Deploying PoolManager ---");
    const PoolManagerArtifact = await ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManagerArtifact.deploy(deployer.address);
    await poolManager.waitForDeployment();
    const poolManagerAddress = await poolManager.getAddress();
    console.log("PoolManager:", poolManagerAddress);

    // 2. Deploy KeepToken (UUPS)
    console.log("\n--- Deploying KeepToken ---");
    const KeepToken = await ethers.getContractFactory("KeepToken");
    const keepTokenProxy = await upgrades.deployProxy(KeepToken, [deployer.address, deployer.address], { kind: 'uups' });
    await keepTokenProxy.waitForDeployment();
    const keepTokenAddress = await keepTokenProxy.getAddress();
    console.log("KeepToken Proxy:", keepTokenAddress);

    // 3. Deploy CellarHook (UUPS)
    console.log("\n--- Deploying CellarHook (UUPS) ---");
    const CellarHook = await ethers.getContractFactory("CellarHook");

    const MON = "0x0000000000000000000000000000000000000000"; // Native
    const KEEP = keepTokenAddress;
    const initPrice = ethers.parseEther("100");
    const epochPeriod = 3600; // 1 hour
    const priceMultiplier = ethers.parseEther("1.1"); // 110%
    const minInitPrice = ethers.parseEther("1"); // 1 MON

    const cellarHookProxy = await upgrades.deployProxy(
        CellarHook,
        [
            poolManagerAddress,
            MON,
            KEEP,
            initPrice,
            epochPeriod,
            priceMultiplier,
            minInitPrice,
            deployer.address // owner
        ],
        { kind: 'uups', initializer: 'initialize' }
    );
    await cellarHookProxy.waitForDeployment();
    const hookAddress = await cellarHookProxy.getAddress();
    console.log("CellarHook Proxy:", hookAddress);

    // 4. Deploy TavernKeeper (UUPS Proxy)
    console.log("\n--- Deploying TavernKeeper ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = await upgrades.deployProxy(TavernKeeper, [], { kind: 'uups' });
    await tavernKeeper.waitForDeployment();
    const tavernKeeperAddress = await tavernKeeper.getAddress();
    console.log("TavernKeeper Proxy:", tavernKeeperAddress);

    // 5. Deploy DungeonGatekeeper (UUPS Proxy)
    console.log("\n--- Deploying DungeonGatekeeper ---");
    const DungeonGatekeeper = await ethers.getContractFactory("DungeonGatekeeper");
    const gatekeeper = await upgrades.deployProxy(DungeonGatekeeper, [deployer.address, deployer.address], { kind: 'uups' });
    await gatekeeper.waitForDeployment();
    const gatekeeperAddress = await gatekeeper.getAddress();
    console.log("DungeonGatekeeper Proxy:", gatekeeperAddress);

    // 6. Deploy CellarZapV4 (UUPS Proxy)
    console.log("\n--- Deploying CellarZapV4 ---");
    const CellarZapV4 = await ethers.getContractFactory("CellarZapV4");
    const zapProxy = await upgrades.deployProxy(
        CellarZapV4,
        [
            poolManagerAddress,
            hookAddress,
            MON,
            KEEP,
            deployer.address
        ],
        { kind: 'uups', initializer: 'initialize' }
    );
    await zapProxy.waitForDeployment();
    const zapAddress = await zapProxy.getAddress();
    console.log("CellarZapV4 Proxy:", zapAddress);

    // 7. Configure Contracts
    console.log("\n--- Configuring Contracts ---");

    // Wire KeepToken <-> TavernKeeper
    console.log("Setting TavernKeeper on KeepToken...");
    await (await keepTokenProxy.setTavernKeeperContract(tavernKeeperAddress)).wait();

    console.log("Setting KeepToken on TavernKeeper...");
    await (await tavernKeeper.setKeepTokenContract(keepTokenAddress)).wait();

    // Initialize TavernKeeper V2 with CellarHook as treasury
    console.log("Initializing TavernKeeper V2 (Treasury = CellarHook)...");
    await (await tavernKeeper.initializeOfficeV2(hookAddress)).wait();

    // Set pricing signer for signature-based pricing
    const pricingSigner = process.env.PRICING_SIGNER_ADDRESS;
    if (pricingSigner && pricingSigner !== '0x0000000000000000000000000000000000000000') {
        console.log("Setting pricing signer on TavernKeeper...");
        await (await tavernKeeper.setSigner(pricingSigner)).wait();
        console.log("✓ Pricing signer set");
    } else {
        console.log("⚠️  PRICING_SIGNER_ADDRESS not set - contracts will not work until signer is set");
    }

    // 8. Update Frontend & Tracker
    console.log("\n--- Updating Frontend & Tracker ---");
    await updateFrontendAddresses({
        POOL_MANAGER: poolManagerAddress,
        KEEP_TOKEN: keepTokenAddress,
        THE_CELLAR: hookAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        CELLAR_ZAP: zapAddress
    });

    await updateDeploymentTracker({
        POOL_MANAGER: poolManagerAddress,
        KEEP_TOKEN: keepTokenAddress,
        CELLAR_HOOK: hookAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        CELLAR_ZAP: zapAddress,
        CREATE2_FACTORY: "N/A (UUPS)"
    });

    console.log("\n============================================");
    console.log("FULL DEPLOYMENT COMPLETE");
    console.log("============================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
