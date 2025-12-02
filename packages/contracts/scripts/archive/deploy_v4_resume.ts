import { ethers, upgrades } from "hardhat";
import { updateDeploymentTracker } from "./updateDeploymentTracker";
import { updateFrontendAddresses } from "./updateFrontend";

// Hook Flags (Needed for mining)
const HOOK_FLAGS = {
    BEFORE_INITIALIZE: 1 << 13,
    AFTER_INITIALIZE: 1 << 12,
    BEFORE_ADD_LIQUIDITY: 1 << 11,
    AFTER_ADD_LIQUIDITY: 1 << 10,
    BEFORE_REMOVE_LIQUIDITY: 1 << 9,
    AFTER_REMOVE_LIQUIDITY: 1 << 8,
    BEFORE_SWAP: 1 << 7,
    AFTER_SWAP: 1 << 6,
    BEFORE_DONATE: 1 << 5,
    AFTER_DONATE: 1 << 4,
    BEFORE_SWAP_RETURN_DELTA: 1 << 3,
    AFTER_SWAP_RETURN_DELTA: 1 << 2,
    AFTER_ADD_LIQUIDITY_RETURN_DELTA: 1 << 1,
    AFTER_REMOVE_LIQUIDITY_RETURN_DELTA: 1 << 0,
};

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== RESUMING DEPLOYMENT (SAVING GAS) ===");
    console.log("Deployer:", deployer.address);

    // REUSING DEPLOYED CONTRACTS (From Step 2134)
    const poolManagerAddress = "0xa0b790f6A9397c3Fa981CA4443b16C59A920a9da";
    const keepTokenAddress = "0x1d00b6Dbb2f141cf6A8c1bCf70324ec1907E82B1";

    console.log("Reusing PoolManager:", poolManagerAddress);
    console.log("Reusing KeepToken:", keepTokenAddress);

    // 3. Mine Salt for CellarHook
    console.log("\n--- Mining Salt for CellarHook ---");
    const CellarHook = await ethers.getContractFactory("CellarHook");

    // Params
    const MON = "0x0000000000000000000000000000000000000000"; // Native
    const KEEP = keepTokenAddress;
    const initPrice = ethers.parseEther("100");
    const epochPeriod = 3600; // 1 hour
    const priceMultiplier = ethers.parseEther("1.1");
    const minInitPrice = ethers.parseEther("1");

    const constructorArgs = [
        poolManagerAddress,
        MON,
        KEEP,
        initPrice,
        epochPeriod,
        priceMultiplier,
        minInitPrice
    ];

    const creationCode = CellarHook.bytecode;
    const encodedArgs = CellarHook.interface.encodeDeploy(constructorArgs);
    const initCode = creationCode + encodedArgs.slice(2);
    const initCodeHash = ethers.keccak256(initCode);

    // Target Flags: BeforeAdd (11), BeforeRemove (9), BeforeSwap (7), AfterSwap (6)
    // Mask: 0xAC0
    const targetFlags = 0xAC0;

    // 4. Deploy Create2Factory
    console.log("\n--- Deploying Create2Factory ---");
    const Create2Factory = await ethers.getContractFactory("Create2Factory");
    const factory = await Create2Factory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("Create2Factory:", factoryAddress);

    // 5. Deploy CellarHook via Factory
    console.log("\n--- Deploying CellarHook via Factory ---");
    console.log("Re-mining salt for Factory deployment...");

    let salt = 0n;
    let hookAddress = "";

    while (true) {
        const saltHex = ethers.toBeHex(salt, 32);
        const computed = ethers.getCreate2Address(factoryAddress, saltHex, initCodeHash);
        const addrInt = BigInt(computed);
        if ((addrInt & 0x3FFFn) === BigInt(targetFlags)) {
            hookAddress = computed;
            console.log(`Found salt: ${saltHex}`);
            console.log(`Expected Address: ${hookAddress}`);
            break;
        }
        salt++;
        if (salt % 100000n === 0n) console.log(`Checked ${salt} salts...`);
    }

    const tx = await factory.deploy(salt, initCode, { gasLimit: 10000000 });
    await tx.wait();
    console.log("CellarHook Deployed to:", hookAddress);

    // 6. Deploy TavernKeeper (UUPS Proxy)
    console.log("\n--- Deploying TavernKeeper (Proxy) ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = await upgrades.deployProxy(TavernKeeper, [], { kind: 'uups' });
    await tavernKeeper.waitForDeployment();
    const tavernKeeperAddress = await tavernKeeper.getAddress();
    console.log("TavernKeeper Proxy:", tavernKeeperAddress);

    // 7. Deploy DungeonGatekeeper (UUPS Proxy)
    console.log("\n--- Deploying DungeonGatekeeper (Proxy) ---");
    const DungeonGatekeeper = await ethers.getContractFactory("DungeonGatekeeper");
    const gatekeeper = await upgrades.deployProxy(DungeonGatekeeper, [deployer.address, deployer.address], { kind: 'uups' });
    await gatekeeper.waitForDeployment();
    const gatekeeperAddress = await gatekeeper.getAddress();
    console.log("DungeonGatekeeper Proxy:", gatekeeperAddress);

    // 8. Deploy CellarZapV4
    console.log("\n--- Deploying CellarZapV4 ---");
    const CellarZapV4 = await ethers.getContractFactory("CellarZapV4");
    const zap = await CellarZapV4.deploy(poolManagerAddress, hookAddress, MON, KEEP);
    await zap.waitForDeployment();
    const zapAddress = await zap.getAddress();
    console.log("CellarZapV4:", zapAddress);

    // 9. Configure Contracts
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

    // Set pricing signer for signature-based pricing (if deploying new contracts)
    // For upgrades, use upgrade_signature_pricing.ts script instead
    const pricingSigner = process.env.PRICING_SIGNER_ADDRESS;
    if (pricingSigner && pricingSigner !== '0x0000000000000000000000000000000000000000') {
        console.log("Setting pricing signer on TavernKeeper...");
        await (await tavernKeeper.setSigner(pricingSigner)).wait();
        console.log("✓ Pricing signer set");
    } else {
        console.log("⚠️  PRICING_SIGNER_ADDRESS not set - contracts will not work until signer is set");
    }

    // 10. Update Frontend
    updateFrontendAddresses({
        THE_CELLAR: hookAddress,
        KEEP_TOKEN: keepTokenAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        POOL_MANAGER: poolManagerAddress,
        CELLAR_ZAP: zapAddress
    });

    // 11. Update Deployment Tracker
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
    console.log("RESUME COMPLETE");
    console.log("============================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
