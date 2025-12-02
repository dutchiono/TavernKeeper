import { ethers, upgrades } from "hardhat";
import { updateFrontendAddresses } from "./updateFrontend";
import { updateDeploymentTracker } from "./updateDeploymentTracker";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== SALVAGING DEPLOYMENT (TAVERNKEEPER ONLY) ===");
    console.log("Deployer:", deployer.address);

    // Existing Addresses from Step 2035 (The successful run)
    const poolManagerAddress = "0x1998A902dEca90968bd6F54199873731b43C12Ee";
    const keepTokenAddress = "0x1a5b890F29832a63FC88594Df8b7147Da0a0Cca0";
    const hookAddress = "0x2f5C244222FBc880b5AACefBe82c1cb4a2994Ac0";
    const gatekeeperAddress = "0xB05352575F0CdA6cb3a69E9E98Ea092dE8d4c9B4";
    const zapAddress = "0x333F2CAcfAf9e5AaE26002A4Bd039780A4C9b336";
    const factoryAddress = "0x68d39BFe03cc25C17d538E87A5a0a715561D5B4C";

    console.log("Using existing contracts:");
    console.log("- PoolManager:", poolManagerAddress);
    console.log("- KeepToken:", keepTokenAddress);
    console.log("- CellarHook:", hookAddress);

    // 1. Deploy TavernKeeper (UUPS Proxy)
    console.log("\n--- Deploying TavernKeeper (Proxy) ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = await upgrades.deployProxy(TavernKeeper, [], { kind: 'uups' });
    await tavernKeeper.waitForDeployment();
    const tavernKeeperAddress = await tavernKeeper.getAddress();
    console.log("TavernKeeper Proxy:", tavernKeeperAddress);

    // 2. Configure Contracts
    console.log("\n--- Configuring Contracts ---");

    // Attach to existing KeepToken
    const KeepToken = await ethers.getContractFactory("KeepToken");
    const keepToken = KeepToken.attach(keepTokenAddress);

    // Wire KeepToken <-> TavernKeeper
    console.log("Setting TavernKeeper on KeepToken...");
    await (await keepToken.setTavernKeeperContract(tavernKeeperAddress)).wait();

    console.log("Setting KeepToken on TavernKeeper...");
    await (await tavernKeeper.setKeepTokenContract(keepTokenAddress)).wait();

    // Initialize TavernKeeper V2 with CellarHook as treasury
    console.log("Initializing TavernKeeper V2 (Treasury = CellarHook)...");
    await (await tavernKeeper.initializeOfficeV2(hookAddress)).wait();

    // 3. Update Frontend
    updateFrontendAddresses({
        THE_CELLAR: hookAddress,
        KEEP_TOKEN: keepTokenAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        POOL_MANAGER: poolManagerAddress,
        CELLAR_ZAP: zapAddress
    });

    // 4. Update Deployment Tracker
    updateDeploymentTracker({
        POOL_MANAGER: poolManagerAddress,
        KEEP_TOKEN: keepTokenAddress,
        CELLAR_HOOK: hookAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        CELLAR_ZAP: zapAddress,
        CREATE2_FACTORY: factoryAddress
    });

    console.log("\n============================================");
    console.log("SALVAGE COMPLETE");
    console.log("============================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
