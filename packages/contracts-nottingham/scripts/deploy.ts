import { ethers, upgrades, network } from "hardhat";

const MAINNET_ID = 4663n;

async function main() {
    const [deployer] = await ethers.getSigners();
    const net = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`Network:  ${network.name} (chainId ${net.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance:  ${ethers.formatEther(balance)} ETH\n`);

    if (net.chainId === MAINNET_ID) {
        console.log("*** ROBINHOOD MAINNET ***\n");
    }

    // Treasury (the Coffers). Falls back to the deployer for local runs only.
    const treasury = process.env.NOTTINGHAM_TREASURY_ADDRESS || deployer.address;
    if (treasury === deployer.address && net.chainId === MAINNET_ID) {
        throw new Error("Set NOTTINGHAM_TREASURY_ADDRESS before deploying to mainnet");
    }
    console.log(`Treasury: ${treasury}`);

    const Token = await ethers.getContractFactory("NottToken");
    const token = await upgrades.deployProxy(Token, [treasury], { kind: "uups" });
    await token.waitForDeployment();
    const tokenAddr = await token.getAddress();
    console.log(`NottToken:     ${tokenAddr}`);

    const Office = await ethers.getContractFactory("SheriffsOffice");
    const office = await upgrades.deployProxy(Office, [tokenAddr, treasury], { kind: "uups" });
    await office.waitForDeployment();
    const officeAddr = await office.getAddress();
    console.log(`SheriffsOffice: ${officeAddr}`);

    // Wire the office as the sole minter. Until this lands, nothing can mint.
    const tx = await token.setSheriffsOffice(officeAddr);
    await tx.wait();
    console.log(`\nMinter wired. Office price: ${ethers.formatEther(await office.getPrice())} ETH`);
    console.log(`Emission: ${ethers.formatEther(await office.getDps())} NOTT/sec`);

    console.log("\nVerify with:");
    console.log(`  npx hardhat verify --network ${network.name} ${tokenAddr}`);
    console.log(`  npx hardhat verify --network ${network.name} ${officeAddr}`);
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
