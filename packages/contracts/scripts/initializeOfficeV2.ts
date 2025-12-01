import { ethers } from "hardhat";

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;
    const treasuryAddress = process.env.TREASURY_ADDRESS;

    if (!proxyAddress || !treasuryAddress) {
        console.error("Error: PROXY_ADDRESS and TREASURY_ADDRESS must be set");
        process.exit(1);
    }

    const [deployer] = await ethers.getSigners();
    console.log("Initializing V2 with account:", deployer.address);

    const tavernKeeper = await ethers.getContractAt("TavernKeeper", proxyAddress);

    console.log("Calling initializeOfficeV2...");
    const tx = await tavernKeeper.initializeOfficeV2(treasuryAddress);
    console.log("Transaction sent:", tx.hash);

    await tx.wait();
    console.log("Initialization complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
