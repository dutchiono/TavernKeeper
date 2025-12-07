import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function main() {
    console.log("🚀 DEPLOYING SIMPLE SWAP ROUTER FOR V3 POOL...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} MON\n`);

    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // Deploy SimpleSwapRouter
    console.log("📦 Deploying SimpleSwapRouter...");
    const SimpleSwapRouter = await ethers.getContractFactory("SimpleSwapRouter");
    const router = await SimpleSwapRouter.deploy();
    await router.waitForDeployment();

    const routerAddress = await router.getAddress();
    console.log(`✅ SimpleSwapRouter deployed at: ${routerAddress}\n`);

    console.log("⚠️  UPDATE addresses.ts with:");
    console.log(`V3_SWAP_ROUTER: '${routerAddress}' as Address,`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

