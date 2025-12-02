import fs from "fs";
import { ethers, upgrades } from "hardhat";
import path from "path";
import { updateFrontendAddresses } from "./updateFrontend";

/**
 * Deploys CellarZapV4 as UUPS upgradeable proxy
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== DEPLOYING CELLARZAPV4 AS UUPS PROXY ===");
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
    const CellarHook = info.contracts.cellarHook; // Should be the new proxy address
    const MON = "0x0000000000000000000000000000000000000000"; // Native

    if (!PoolManager || !KeepToken || !CellarHook) {
        console.error("Missing dependencies in deployment-info-v4.json");
        console.error("Required: poolManager, keepToken, cellarHook");
        console.error("Note: CellarHook must be deployed first!");
        process.exit(1);
    }

    console.log("Deployment Parameters:");
    console.log("  PoolManager:", PoolManager);
    console.log("  CellarHook (proxy):", CellarHook);
    console.log("  KeepToken:", KeepToken);
    console.log("  MON (native):", MON);
    console.log("");

    console.log("--- Step 1: Deploying CellarZapV4 Implementation ---");
    const CellarZapV4 = await ethers.getContractFactory("CellarZapV4");
    const implementation = await CellarZapV4.deploy();
    await implementation.waitForDeployment();
    const implAddress = await implementation.getAddress();
    console.log("✓ Implementation deployed:", implAddress);
    console.log("");

    console.log("--- Step 2: Deploying UUPS Proxy ---");
    const proxy = await upgrades.deployProxy(
        CellarZapV4,
        [
            PoolManager,
            CellarHook,
            MON,
            KeepToken,
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
    const cellarZap = await ethers.getContractAt("CellarZapV4", proxyAddress);
    const poolManagerCheck = await cellarZap.poolManager();
    const cellarHookCheck = await cellarZap.cellarHook();
    console.log("✓ Contract verified:");
    console.log("  poolManager:", poolManagerCheck);
    console.log("  cellarHook:", cellarHookCheck);
    console.log("");

    console.log("--- Step 4: Updating Addresses ---");
    info.contracts.cellarZap = proxyAddress;
    info.contracts.cellarZapImpl = implAddress;
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
    console.log("✓ Updated deployment-info-v4.json");

    updateFrontendAddresses({ CELLAR_ZAP: proxyAddress });
    console.log("✓ Updated frontend addresses");
    console.log("");

    console.log("============================================");
    console.log("DEPLOYMENT COMPLETE!");
    console.log("============================================");
    console.log("CellarZapV4 Proxy:", proxyAddress);
    console.log("CellarZapV4 Implementation:", implAddress);
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
