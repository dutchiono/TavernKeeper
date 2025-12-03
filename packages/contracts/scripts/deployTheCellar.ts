import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // 1. Deploy Mock LP Token
    console.log("Deploying Mock LP Token...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockLP = await MockERC20.deploy("Tavern LP", "KEEP-MON");
    await mockLP.waitForDeployment();
    const mockLPAddress = await mockLP.getAddress();
    console.log("Mock LP deployed to:", mockLPAddress);

    // 2. Deploy The Cellar
    console.log("Deploying The Cellar...");
    const TheCellar = await ethers.getContractFactory("TheCellar");

    const INIT_PRICE = ethers.parseEther("100"); // 100 LP tokens
    const PAYMENT_RECEIVER = "0x000000000000000000000000000000000000dEaD";
    const EPOCH_PERIOD = 3600; // 1 hour
    const PRICE_MULTIPLIER = ethers.parseEther("2"); // 2x
    const MIN_INIT_PRICE = ethers.parseEther("1"); // 1 LP token minimum floor

    const theCellar = await TheCellar.deploy(
        INIT_PRICE,
        mockLPAddress,
        PAYMENT_RECEIVER,
        EPOCH_PERIOD,
        PRICE_MULTIPLIER,
        MIN_INIT_PRICE
    );
    await theCellar.waitForDeployment();
    const cellarAddress = await theCellar.getAddress();
    console.log("The Cellar deployed to:", cellarAddress);

    // 3. Upgrade TavernKeeper
    console.log("Upgrading TavernKeeper...");
    const PROXY_ADDRESS = "0x0A773ACfb23f2d6CC919235c134625bAF515c6F8"; // From Deployment Tracker
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");

    // Validate we are upgrading the right proxy
    const currentImpl = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    console.log("Current Implementation:", currentImpl);

    const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, TavernKeeper);
    await upgraded.waitForDeployment();

    const newImpl = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    console.log("TavernKeeper upgraded. New Implementation:", newImpl);

    // 4. Link The Cellar to TavernKeeper
    console.log("Linking The Cellar to TavernKeeper...");
    // We need to call setTreasury on the proxy
    const tavernKeeper = TavernKeeper.attach(PROXY_ADDRESS);
    const tx = await tavernKeeper.setTreasury(cellarAddress);
    await tx.wait();
    console.log("Treasury set to The Cellar address.");

    console.log("=== Deployment Complete ===");
    console.log("Mock LP:", mockLPAddress);
    console.log("The Cellar:", cellarAddress);
    console.log("TavernKeeper Proxy:", PROXY_ADDRESS);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
