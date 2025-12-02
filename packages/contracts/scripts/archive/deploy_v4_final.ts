import { ethers } from "hardhat";
import { updateFrontendAddresses } from "./updateFrontend";
import { updateDeploymentTracker } from "./updateDeploymentTracker";

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
    console.log("=== FINALIZING V4 DEPLOYMENT ===");
    console.log("Deployer:", deployer.address);

    // 1. Load Existing Addresses (Hardcoded to avoid import issues)
    const poolManagerAddress = "0xa0b790f6A9397c3Fa981CA4443b16C59A920a9da";
    const keepTokenAddress = "0x1d00b6Dbb2f141cf6A8c1bCf70324ec1907E82B1";
    const tavernKeeperAddress = "0x311d8722A5cE11DF157D7a9d414bbeC2640c5Fb2";
    const gatekeeperAddress = "0x1548b5DbCa42C016873fE60Ed0797985127Ea93c";
    // We will redeploy CellarHook and CellarZap

    console.log("Reusing PoolManager:", poolManagerAddress);
    console.log("Reusing KeepToken:", keepTokenAddress);
    console.log("Reusing TavernKeeper:", tavernKeeperAddress);

    // 2. Deploy Create2Factory (if not exists, but we'll just deploy a new one to be safe/simple)
    // Actually, let's try to reuse the factory if we knew it, but deploying a new one is cheap on testnet.
    console.log("\n--- Deploying Create2Factory ---");
    const Create2Factory = await ethers.getContractFactory("Create2Factory");
    const factory = await Create2Factory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("Create2Factory:", factoryAddress);

    // 3. Mine Salt for CellarHook (Redeploying with receive())
    console.log("\n--- Mining Salt for CellarHook (Fixing receive()) ---");
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

    let salt = 0n;
    let hookAddress = "";

    console.log("Mining salt...");
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

    // 4. Deploy CellarZapV4
    console.log("\n--- Deploying CellarZapV4 ---");
    const CellarZapV4 = await ethers.getContractFactory("CellarZapV4");
    const zap = await CellarZapV4.deploy(poolManagerAddress, hookAddress, MON, KEEP);
    await zap.waitForDeployment();
    const zapAddress = await zap.getAddress();
    console.log("CellarZapV4:", zapAddress);

    // 5. Update TavernKeeper Treasury
    console.log("\n--- Updating TavernKeeper Treasury ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(tavernKeeperAddress);

    // Check if we are owner
    const owner = await tavernKeeper.owner();
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("Updating treasury to new CellarHook...");
        const tx = await tavernKeeper.setTreasury(hookAddress);
        await tx.wait();
        console.log("Treasury updated.");
    } else {
        console.error("Deployer is not owner of TavernKeeper! Cannot update treasury.");
    }

    // 6. Update Frontend
    console.log("\n--- Updating Frontend & Tracker ---");
    await updateFrontendAddresses({
        THE_CELLAR: hookAddress,
        CELLAR_ZAP: zapAddress,
        // Others remain same
        KEEP_TOKEN: keepTokenAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        POOL_MANAGER: poolManagerAddress,
    });

    await updateDeploymentTracker({
        CELLAR_HOOK: hookAddress,
        CELLAR_ZAP: zapAddress,
        // Others remain same
        POOL_MANAGER: poolManagerAddress,
        KEEP_TOKEN: keepTokenAddress,
        TAVERNKEEPER: tavernKeeperAddress,
        DUNGEON_GATEKEEPER: gatekeeperAddress,
        CREATE2_FACTORY: factoryAddress
    });

    console.log("\n============================================");
    console.log("FINAL DEPLOYMENT COMPLETE");
    console.log("============================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
