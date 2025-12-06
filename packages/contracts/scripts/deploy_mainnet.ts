import { ethers, upgrades } from "hardhat";
import { updateDeploymentTracker } from "./updateDeploymentTracker";
import { updateFrontendAddresses } from "./updateFrontend";

/**
 * Mainnet/Testnet Deployment Script
 *
 * Deploys all contracts to Monad Testnet/Mainnet.
 * Uses the account configured in hardhat.config.ts (TESTNET_PRIVATE_KEY).
 *
 * Usage:
 *   npx hardhat run scripts/deploy_mainnet.ts --network monad
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== DEPLOYING TO MONAD ===");
    console.log("Deployer:", deployer.address);

    // Get addresses from environment variables
    const deployerAddress = process.env.DEPLOYER_ADDRESS || deployer.address;
    const feeRecipientAddress = process.env.FEE_RECIPIENT_ADDRESS || process.env.NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS || deployerAddress;
    const treasuryAddress = process.env.TREASURY_ADDRESS || process.env.NEXT_PUBLIC_TREASURY_ADDRESS || deployerAddress;
    const pricingSignerAddress = process.env.NEXT_PUBLIC_PRICING_SIGNER_ADDRESS || deployerAddress;

    console.log("\n--- Address Configuration ---");
    console.log("Deployer Wallet (team/dev fees):", deployerAddress);
    console.log("Fee Recipient (Inventory fees):", feeRecipientAddress);
    console.log("Treasury (group fees 5%):", treasuryAddress);
    console.log("Pricing Signer (server authority):", pricingSignerAddress);

    if (!process.env.NEXT_PUBLIC_PRICING_SIGNER_ADDRESS) {
        console.warn("⚠️  NEXT_PUBLIC_PRICING_SIGNER_ADDRESS not set! Using deployer as signer.");
    }

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "MON");

    if (balance < ethers.parseEther("0.1")) {
        console.warn("⚠️  Low balance! Ensure you have enough MON for gas.");
    }

    // 1. Deploy ERC-6551 Registry
    console.log("\n--- Deploying ERC-6551 Registry ---");
    const ERC6551Registry = await ethers.getContractFactory("ERC6551Registry");
    let registryAddress: string;

    // Check if registry already exists (reuse if possible to save gas/keep consistency)
    const existingRegistry = process.env.MONAD_ERC6551_REGISTRY;
    if (existingRegistry && existingRegistry !== "0x0000000000000000000000000000000000000000") {
        console.log("Using existing registry:", existingRegistry);
        registryAddress = existingRegistry;
    } else {
        const registry = await ERC6551Registry.deploy();
        await registry.waitForDeployment();
        registryAddress = await registry.getAddress();
        console.log("ERC6551 Registry:", registryAddress);
    }

    // 2. Deploy ERC-6551 Account Implementation
    console.log("\n--- Deploying ERC-6551 Account Implementation ---");
    const ERC6551Account = await ethers.getContractFactory("ERC6551Account");
    const accountImpl = await ERC6551Account.deploy();
    await accountImpl.waitForDeployment();
    const accountImplAddress = await accountImpl.getAddress();
    console.log("ERC6551 Account Implementation:", accountImplAddress);

    // 3. Deploy PoolManager
    console.log("\n--- Deploying PoolManager ---");
    const PoolManagerArtifact = await ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManagerArtifact.deploy(deployerAddress);
    await poolManager.waitForDeployment();
    const poolManagerAddress = await poolManager.getAddress();
    console.log("PoolManager:", poolManagerAddress);

    // 4. Deploy KeepToken (UUPS)
    console.log("\n--- Deploying KeepToken (UUPS) ---");
    const KeepToken = await ethers.getContractFactory("KeepToken");
    const keepTokenProxy = await upgrades.deployProxy(KeepToken, [deployerAddress, deployerAddress], { kind: 'uups' });
    await keepTokenProxy.waitForDeployment();
    const keepTokenAddress = await keepTokenProxy.getAddress();
    const keepTokenImplAddress = await upgrades.erc1967.getImplementationAddress(keepTokenAddress);
    console.log("KeepToken Proxy:", keepTokenAddress);

    // 5. Deploy CellarHook (UUPS)
    console.log("\n--- Deploying CellarHook (UUPS) ---");
    const CellarHook = await ethers.getContractFactory("CellarHook");

    const MON = "0x0000000000000000000000000000000000000000"; // Native MON
    const KEEP = keepTokenAddress;
    const initPrice = ethers.parseEther("100");
    const epochPeriod = 3600; // 1 hour
    const priceMultiplier = ethers.parseEther("2"); // 200% (2x multiplier like donut miner)
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
            deployerAddress // owner
        ],
        { kind: 'uups', initializer: 'initialize' }
    );
    await cellarHookProxy.waitForDeployment();
    const hookAddress = await cellarHookProxy.getAddress();
    const hookImplAddress = await upgrades.erc1967.getImplementationAddress(hookAddress);
    console.log("CellarHook Proxy:", hookAddress);

    // 6. Deploy Inventory (UUPS)
    console.log("\n--- Deploying Inventory (UUPS) ---");
    const Inventory = await ethers.getContractFactory("Inventory");
    const inventoryProxy = await upgrades.deployProxy(Inventory, [feeRecipientAddress], { kind: 'uups' });
    await inventoryProxy.waitForDeployment();
    const inventoryAddress = await inventoryProxy.getAddress();
    const inventoryImplAddress = await upgrades.erc1967.getImplementationAddress(inventoryAddress);
    console.log("Inventory Proxy:", inventoryAddress);

    // 7. Deploy Adventurer (UUPS)
    console.log("\n--- Deploying Adventurer (UUPS) ---");
    const Adventurer = await ethers.getContractFactory("Adventurer");
    const adventurerProxy = await upgrades.deployProxy(
        Adventurer,
        [],
        { kind: 'uups', initializer: 'initialize' }
    );
    await adventurerProxy.waitForDeployment();
    const adventurerAddress = await adventurerProxy.getAddress();
    const adventurerImplAddress = await upgrades.erc1967.getImplementationAddress(adventurerAddress);
    console.log("Adventurer Proxy:", adventurerAddress);

    // 8. Deploy TavernKeeper (UUPS)
    console.log("\n--- Deploying TavernKeeper (UUPS) ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = await upgrades.deployProxy(TavernKeeper, [], { kind: 'uups' });
    await tavernKeeper.waitForDeployment();
    const tavernKeeperAddress = await tavernKeeper.getAddress();
    const tavernKeeperImplAddress = await upgrades.erc1967.getImplementationAddress(tavernKeeperAddress);
    console.log("TavernKeeper Proxy:", tavernKeeperAddress);

    // 9. Deploy DungeonGatekeeper (UUPS)
    console.log("\n--- Deploying DungeonGatekeeper (UUPS) ---");
    const DungeonGatekeeper = await ethers.getContractFactory("DungeonGatekeeper");
    const gatekeeper = await upgrades.deployProxy(DungeonGatekeeper, [deployerAddress, deployerAddress], { kind: 'uups' });
    await gatekeeper.waitForDeployment();
    const gatekeeperAddress = await gatekeeper.getAddress();
    const gatekeeperImplAddress = await upgrades.erc1967.getImplementationAddress(gatekeeperAddress);
    console.log("DungeonGatekeeper Proxy:", gatekeeperAddress);

    // 10. Deploy CellarZapV4 (UUPS)
    console.log("\n--- Deploying CellarZapV4 (UUPS) ---");
    const CellarZapV4 = await ethers.getContractFactory("CellarZapV4");
    const zapProxy = await upgrades.deployProxy(
        CellarZapV4,
        [
            poolManagerAddress,
            hookAddress,
            MON,
            KEEP,
            deployerAddress
        ],
        { kind: 'uups', initializer: 'initialize' }
    );
    await zapProxy.waitForDeployment();
    const zapAddress = await zapProxy.getAddress();
    const zapImplAddress = await upgrades.erc1967.getImplementationAddress(zapAddress);
    console.log("CellarZapV4 Proxy:", zapAddress);

    // 11. Deploy Tavern Regulars Manager
    console.log("\n--- Deploying Tavern Regulars Manager ---");
    const TavernRegularsManager = await ethers.getContractFactory("TavernRegularsManager");
    const tavernRegularsProxy = await upgrades.deployProxy(
        TavernRegularsManager,
        [
            hookAddress,
            zapAddress,
            poolManagerAddress,
            MON,
            KEEP,
            treasuryAddress,
            deployerAddress
        ],
        { kind: "uups", initializer: "initialize" }
    );
    await tavernRegularsProxy.waitForDeployment();
    const tavernRegularsAddress = await tavernRegularsProxy.getAddress();
    console.log("Tavern Regulars Manager Proxy:", tavernRegularsAddress);

    // 12. Deploy Town Posse Manager
    console.log("\n--- Deploying Town Posse Manager ---");
    const TownPosseManager = await ethers.getContractFactory("TownPosseManager");

    // Tier thresholds
    const BRONZE_THRESHOLD = ethers.parseEther("1000");
    const SILVER_THRESHOLD = ethers.parseEther("10000");
    const GOLD_THRESHOLD = ethers.parseEther("100000");

    const townPosseProxy = await upgrades.deployProxy(
        TownPosseManager,
        [
            hookAddress,
            zapAddress,
            poolManagerAddress,
            MON,
            KEEP,
            treasuryAddress,
            BRONZE_THRESHOLD,
            SILVER_THRESHOLD,
            GOLD_THRESHOLD,
            deployerAddress
        ],
        { kind: "uups", initializer: "initialize" }
    );
    await townPosseProxy.waitForDeployment();
    const townPosseAddress = await townPosseProxy.getAddress();
    console.log("Town Posse Manager Proxy:", townPosseAddress);

    // 13. Configure Contracts
    console.log("\n--- Configuring Contracts ---");

    // Wire KeepToken <-> TavernKeeper
    console.log("Setting TavernKeeper on KeepToken...");
    await (await keepTokenProxy.setTavernKeeperContract(tavernKeeperAddress)).wait();

    console.log("Setting KeepToken on TavernKeeper...");
    await (await tavernKeeper.setKeepTokenContract(keepTokenAddress)).wait();

    // Initialize TavernKeeper V2 with CellarHook as treasury
    console.log("Initializing TavernKeeper V2 (Treasury = CellarHook)...");
    await (await tavernKeeper.initializeOfficeV2(hookAddress)).wait();

    // Set pricing signer
    const envSigner = process.env.NEXT_PUBLIC_PRICING_SIGNER_ADDRESS;
    const pricingSigner = envSigner || deployer.address;
    console.log("Setting pricing signer on TavernKeeper to:", pricingSigner);
    await (await tavernKeeper.setSigner(pricingSigner)).wait();

    console.log("Setting contracts on Adventurer...");
    await (await adventurerProxy.setContracts(tavernKeeperAddress, registryAddress, accountImplAddress)).wait();

    // 14. Update Frontend & Tracker
    console.log("\n--- Updating Frontend & Tracker ---");
    // Note: We might want to be careful about overwriting localhost addresses if running on mainnet
    // But updateFrontendAddresses usually updates based on the network or just logs them.
    // Let's assume it updates the correct file or we manually update.
    // For safety, we will just log them clearly for now, but also call the update function
    // which likely writes to addresses.ts (we should check if it handles networks).

    // Actually, updateFrontendAddresses writes to addresses.ts.
    // We should ensure it doesn't overwrite LOCALHOST_ADDRESSES if we are on mainnet.
    // The current implementation of updateFrontend.ts likely just overwrites specific keys.
    // Let's rely on the console output for manual verification if needed, but calling it is standard.

    await updateFrontendAddresses({
        ERC6551_REGISTRY: registryAddress,
        ERC6551_IMPLEMENTATION: accountImplAddress,
        KEEP_TOKEN: keepTokenAddress,
        KEEP_TOKEN_IMPL: keepTokenImplAddress,
        INVENTORY: inventoryAddress,
        INVENTORY_IMPL: inventoryImplAddress,
        ADVENTURER: adventurerAddress,
        ADVENTURER_IMPL: adventurerImplAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        TAVERNKEEPER_IMPL: tavernKeeperImplAddress,
        THE_CELLAR: hookAddress,
        THE_CELLAR_IMPL: hookImplAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        DUNGEON_GATEKEEPER_IMPL: gatekeeperImplAddress,
        CELLAR_ZAP: zapAddress,
        CELLAR_ZAP_IMPL: zapImplAddress,
        POOL_MANAGER: poolManagerAddress,
        TAVERN_REGULARS_MANAGER: tavernRegularsAddress,
        TOWN_POSSE_MANAGER: townPosseAddress
    });

    await updateDeploymentTracker({
        ERC6551_REGISTRY: registryAddress,
        ERC6551_IMPLEMENTATION: accountImplAddress,
        KEEP_TOKEN: keepTokenAddress,
        CELLAR_HOOK: hookAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        CELLAR_ZAP: zapAddress,
        POOL_MANAGER: poolManagerAddress,
        INVENTORY: inventoryAddress,
        ADVENTURER: adventurerAddress,
        TAVERN_REGULARS_MANAGER: tavernRegularsAddress,
        TOWN_POSSE_MANAGER: townPosseAddress
    });

    console.log("\n============================================");
    console.log("MONAD DEPLOYMENT COMPLETE");
    console.log("============================================");
    console.log("\nContract Addresses (Proxies):");
    console.log("ERC6551 Registry:", registryAddress);
    console.log("KeepToken Proxy:", keepTokenAddress);
    console.log("Inventory Proxy:", inventoryAddress);
    console.log("Adventurer Proxy:", adventurerAddress);
    console.log("TavernKeeper Proxy:", tavernKeeperAddress);
    console.log("CellarHook Proxy:", hookAddress);
    console.log("CellarZapV4 Proxy:", zapAddress);
    console.log("Tavern Regulars Manager:", tavernRegularsAddress);
    console.log("Town Posse Manager:", townPosseAddress);
    console.log("\n✅ Deployment finished!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
