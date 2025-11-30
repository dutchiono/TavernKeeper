import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Fee recipient should be deployer so fees come back to us
    const feeRecipient = deployer.address;
    console.log("Fee recipient (deployer):", feeRecipient);

    // Deploy ERC-6551 Registry (not upgradeable - infrastructure contract)
    console.log("\n=== Deploying ERC-6551 Registry ===");
    const ERC6551Registry = await ethers.getContractFactory("ERC6551Registry");
    const erc6551Registry = await ERC6551Registry.deploy();
    await erc6551Registry.waitForDeployment();
    const registryAddress = await erc6551Registry.getAddress();
    console.log("ERC6551Registry deployed to:", registryAddress);

    // Deploy ERC-6551 Account Implementation (not upgradeable - implementation contract)
    console.log("\n=== Deploying ERC-6551 Account Implementation ===");
    const ERC6551Account = await ethers.getContractFactory("ERC6551Account");
    const erc6551Account = await ERC6551Account.deploy();
    await erc6551Account.waitForDeployment();
    const accountImplAddress = await erc6551Account.getAddress();
    console.log("ERC6551Account implementation deployed to:", accountImplAddress);

    // Deploy TavernKeeper as UUPS proxy (Deploy FIRST to get address for KeepToken)
    console.log("\n=== Deploying TavernKeeper (UUPS Proxy) ===");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = await upgrades.deployProxy(TavernKeeper, [], {
        kind: "uups",
        initializer: "initialize",
    });
    await tavernKeeper.waitForDeployment();
    const tavernKeeperProxyAddress = await tavernKeeper.getAddress();
    const tavernKeeperImplAddress = await upgrades.erc1967.getImplementationAddress(tavernKeeperProxyAddress);
    console.log("TavernKeeper proxy deployed to:", tavernKeeperProxyAddress);
    console.log("TavernKeeper implementation deployed to:", tavernKeeperImplAddress);

    // Deploy KeepToken as UUPS proxy
    console.log("\n=== Deploying KeepToken (UUPS Proxy) ===");
    const KeepToken = await ethers.getContractFactory("KeepToken");
    // Initialize with treasury (deployer) and TavernKeeper address
    const keepTokenImpl = await upgrades.deployProxy(KeepToken, [feeRecipient, tavernKeeperProxyAddress], {
        kind: "uups",
        initializer: "initialize",
    });
    await keepTokenImpl.waitForDeployment();
    const keepTokenProxyAddress = await keepTokenImpl.getAddress();
    const keepTokenImplAddress = await upgrades.erc1967.getImplementationAddress(keepTokenProxyAddress);
    console.log("KeepToken proxy deployed to:", keepTokenProxyAddress);
    console.log("KeepToken implementation deployed to:", keepTokenImplAddress);

    // Link KeepToken to TavernKeeper
    console.log("\n=== Linking Contracts ===");
    console.log("Setting KeepToken address in TavernKeeper...");
    await tavernKeeper.setKeepTokenContract(keepTokenProxyAddress);
    console.log("Done.");

    // Deploy Inventory as UUPS proxy
    console.log("\n=== Deploying Inventory (UUPS Proxy) ===");
    const Inventory = await ethers.getContractFactory("Inventory");
    const inventory = await upgrades.deployProxy(Inventory, [feeRecipient], {
        kind: "uups",
        initializer: "initialize",
    });
    await inventory.waitForDeployment();
    const inventoryProxyAddress = await inventory.getAddress();
    const inventoryImplAddress = await upgrades.erc1967.getImplementationAddress(inventoryProxyAddress);
    console.log("Inventory proxy deployed to:", inventoryProxyAddress);
    console.log("Inventory implementation deployed to:", inventoryImplAddress);
    console.log("Inventory fee recipient:", feeRecipient);

    // Deploy Adventurer as UUPS proxy
    console.log("\n=== Deploying Adventurer (UUPS Proxy) ===");
    const Adventurer = await ethers.getContractFactory("Adventurer");
    const adventurer = await upgrades.deployProxy(Adventurer, [], {
        kind: "uups",
        initializer: "initialize",
    });
    await adventurer.waitForDeployment();
    const adventurerProxyAddress = await adventurer.getAddress();
    const adventurerImplAddress = await upgrades.erc1967.getImplementationAddress(adventurerProxyAddress);
    console.log("Adventurer proxy deployed to:", adventurerProxyAddress);
    console.log("Adventurer implementation deployed to:", adventurerImplAddress);

    // Summary
    console.log("\n=== Deployment Summary ===");
    console.log("ERC6551Registry:", registryAddress);
    console.log("ERC6551Account Implementation:", accountImplAddress);
    console.log("TavernKeeper Proxy:", tavernKeeperProxyAddress);
    console.log("TavernKeeper Implementation:", tavernKeeperImplAddress);
    console.log("KeepToken Proxy:", keepTokenProxyAddress);
    console.log("KeepToken Implementation:", keepTokenImplAddress);
    console.log("Inventory Proxy:", inventoryProxyAddress);
    console.log("Inventory Implementation:", inventoryImplAddress);
    console.log("Adventurer Proxy:", adventurerProxyAddress);
    console.log("Adventurer Implementation:", adventurerImplAddress);

    // Save deployment info to file
    const fs = require("fs");
    const path = require("path");
    const deploymentFile = path.join(__dirname, "..", "wallets", "deployment-info.json");
    const deploymentDir = path.dirname(deploymentFile);

    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const network = await ethers.provider.getNetwork();
    const deploymentInfo = {
        network: "Monad Testnet",
        chainId: Number(network.chainId),
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        contracts: {
            erc6551Registry: registryAddress,
            erc6551AccountImplementation: accountImplAddress,
            tavernKeeperProxy: tavernKeeperProxyAddress,
            tavernKeeperImplementation: tavernKeeperImplAddress,
            keepTokenProxy: keepTokenProxyAddress,
            keepTokenImplementation: keepTokenImplAddress,
            inventoryProxy: inventoryProxyAddress,
            inventoryImplementation: inventoryImplAddress,
            adventurerProxy: adventurerProxyAddress,
            adventurerImplementation: adventurerImplAddress,
        },
        feeRecipient: feeRecipient,
    };

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentFile}`);

    console.log("\n=== IMPORTANT: Update DEPLOYMENT_TRACKER.md with these addresses ===");
    console.log("Also update .env files with proxy addresses (not implementation addresses)");
    console.log("\n=== Next Steps ===");
    console.log("1. Run: npx hardhat run scripts/generateTestWallets.ts");
    console.log("2. Run: npx hardhat run scripts/fundTestWallets.ts --network monad");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
