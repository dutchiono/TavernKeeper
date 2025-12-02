import fs from "fs";
import { ethers } from "hardhat";
import path from "path";
import { updateFrontendAddresses } from "./updateFrontend";

/**
 * Fixes CellarHook potBalance bug by:
 * 1. Redeploying CellarHook with fixed receive() function
 * 2. Updating TavernKeeper treasury to point to new CellarHook
 * 3. Updating frontend addresses
 *
 * IMPORTANT: This will create a NEW CellarHook address.
 * The old contract will still exist with 0.15 MON, but won't receive new funds.
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== FIXING CELLAR POTBALANCE BUG ===");
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
    const Factory = info.contracts.create2Factory;
    const TavernKeeperProxy = process.env.TAVERN_KEEPER_PROXY || "0x311d8722A5cE11DF157D7a9d414bbeC2640c5Fb2";
    // Use address from addresses.ts (what frontend uses) as the old address
    const oldCellarHook = "0x41ceC2cE651D37830af8FD94a35d23d428F80aC0";

    if (!PoolManager || !KeepToken || !Factory) {
        console.error("Missing dependencies in deployment-info-v4.json");
        console.error("Required: poolManager, keepToken, create2Factory");
        process.exit(1);
    }

    console.log("Current addresses:");
    console.log("  PoolManager:", PoolManager);
    console.log("  KeepToken:", KeepToken);
    console.log("  Create2Factory:", Factory);
    console.log("  TavernKeeper Proxy:", TavernKeeperProxy);
    console.log("  Old CellarHook:", oldCellarHook);
    console.log("");

    // Step 1: Redeploy CellarHook with fixed receive() function
    console.log("--- Step 1: Redeploying CellarHook with potBalance fix ---");
    const CellarHook = await ethers.getContractFactory("CellarHook");

    // Use same constructor parameters as existing deployment
    // These should match the current deployed contract's parameters
    const initPrice = ethers.parseEther("100");
    const epochPeriod = 3600; // 1 hour
    const priceMultiplier = ethers.parseEther("1.1"); // 110%
    const minInitPrice = ethers.parseEther("1"); // 1 MON

    const constructorArgs = [
        PoolManager,
        "0x0000000000000000000000000000000000000000", // MON (native)
        KeepToken,
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

    console.log("Mining salt for new CellarHook address...");
    console.log("(This may take a while - checking addresses for hook flags)");
    while (true) {
        const saltHex = ethers.toBeHex(salt, 32);
        const computed = ethers.getCreate2Address(Factory, saltHex, initCodeHash);
        const addrInt = BigInt(computed);
        if ((addrInt & BigInt(targetFlags)) === BigInt(targetFlags)) {
            hookAddress = computed;
            console.log(`✓ Found salt: ${saltHex}`);
            console.log(`  New CellarHook address: ${hookAddress}`);
            break;
        }
        salt++;
        if (salt % 100000n === 0n) {
            console.log(`  Checked ${salt} salts...`);
        }
    }

    // Check if address is already deployed
    const code = await ethers.provider.getCode(hookAddress);
    if (code !== "0x") {
        console.error(`ERROR: Address ${hookAddress} is already deployed!`);
        console.error("This means the contract bytecode matches an existing deployment.");
        console.error("Please verify the contract code has changed.");
        process.exit(1);
    }

    // Deploy via Create2Factory (same pattern as upgrade_v4_contracts.ts)
    console.log("Deploying CellarHook via Create2Factory...");

    // First, test if we can estimate gas (this will fail if constructor will fail)
    const Create2Factory = await ethers.getContractAt("Create2Factory", Factory);

    try {
        console.log("  Testing gas estimation...");
        const gasEstimate = await Create2Factory.deploy.estimateGas(salt, initCode);
        console.log("  ✓ Gas estimate:", gasEstimate.toString());
    } catch (error: any) {
        console.error("✗ Gas estimation failed - constructor will revert!");
        console.error("  This means the contract cannot be deployed with these parameters.");
        console.error("  Error:", error.message);
        console.error("\n  Possible issues:");
        console.error("    1. Contract bytecode too large (>24KB limit)");
        console.error("    2. Constructor parameters invalid");
        console.error("    3. Constructor logic failing");
        process.exit(1);
    }

    try {
        const tx = await Create2Factory.deploy(salt, initCode);
        console.log("  Transaction sent:", tx.hash);
        const receipt = await tx.wait();

        if (receipt && receipt.status === 1) {
            // Verify deployment
            const code = await ethers.provider.getCode(hookAddress);
            if (code === "0x") {
                throw new Error("Contract not found at expected address after deployment");
            }
            console.log("✓ CellarHook deployed!");
            console.log("  Transaction:", receipt.hash);
            console.log("  Address:", hookAddress);
            console.log("");
        } else {
            throw new Error("Transaction reverted");
        }
    } catch (error: any) {
        console.error("✗ Deployment failed!");
        console.error("  Error:", error.message);

        // Try to get more details
        try {
            const code = await ethers.provider.getCode(hookAddress);
            console.error("  Code at address:", code === "0x" ? "None" : "Exists");
        } catch {}

        // Check if maybe the address computation is wrong
        console.error("\n  Debugging info:");
        console.error("    Salt:", salt.toString());
        console.error("    Factory:", Factory);
        console.error("    Expected address:", hookAddress);
        console.error("    InitCode length:", initCode.length);

        process.exit(1);
    }

    // Step 2: Update TavernKeeper treasury address
    console.log("--- Step 2: Updating TavernKeeper treasury address ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(TavernKeeperProxy);

    // Check current treasury
    const currentTreasury = await tavernKeeper.treasury();
    console.log("Current treasury:", currentTreasury);
    console.log("New treasury:", hookAddress);

    if (currentTreasury.toLowerCase() === hookAddress.toLowerCase()) {
        console.log("✓ Treasury already set to new address");
    } else {
        console.log("Updating treasury address...");
        const setTreasuryTx = await tavernKeeper.setTreasury(hookAddress);
        await setTreasuryTx.wait();
        console.log("✓ Treasury updated!");
        console.log("  Transaction:", setTreasuryTx.hash);
    }
    console.log("");

    // Step 3: Update deployment info and frontend addresses
    console.log("--- Step 3: Updating addresses ---");
    info.contracts.cellarHook = hookAddress;
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
    console.log("✓ Updated deployment-info-v4.json");

    updateFrontendAddresses({ THE_CELLAR: hookAddress });
    console.log("✓ Updated frontend addresses");
    console.log("");

    // Step 4: Verify the fix
    console.log("--- Step 4: Verifying deployment ---");
    const newCellarHook = await ethers.getContractAt("CellarHook", hookAddress);
    const potBalance = await newCellarHook.potBalance();
    const slot0 = await newCellarHook.slot0();
    console.log("✓ New CellarHook verified:");
    console.log("  potBalance:", ethers.formatEther(potBalance), "MON");
    console.log("  epochId:", slot0.epochId.toString());
    console.log("  initPrice:", ethers.formatEther(slot0.initPrice), "MON");
    console.log("");

    // Verify TavernKeeper treasury
    const verifiedTreasury = await tavernKeeper.treasury();
    if (verifiedTreasury.toLowerCase() === hookAddress.toLowerCase()) {
        console.log("✓ TavernKeeper treasury verified:", verifiedTreasury);
    } else {
        console.error("✗ WARNING: TavernKeeper treasury mismatch!");
        console.error("  Expected:", hookAddress);
        console.error("  Got:", verifiedTreasury);
    }
    console.log("");

    // Summary
    console.log("============================================");
    console.log("UPGRADE COMPLETE!");
    console.log("============================================");
    console.log("New CellarHook:", hookAddress);
    console.log("Old CellarHook:", oldCellarHook);
    console.log("TavernKeeper treasury:", verifiedTreasury);
    console.log("");
    console.log("⚠️  IMPORTANT NOTES:");
    console.log("  1. The old CellarHook still exists at:", oldCellarHook);
    console.log("  2. It contains ~0.15 MON that won't be tracked by potBalance");
    console.log("  3. All new funds will go to the new CellarHook");
    console.log("  4. Please update DEPLOYMENT_TRACKER.md with the new address");
    console.log("  5. Test the receive() function by sending MON to verify potBalance updates");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
