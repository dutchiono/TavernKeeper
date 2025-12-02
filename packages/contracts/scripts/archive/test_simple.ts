import { ethers } from "hardhat";

async function main() {
    console.log("TEST SCRIPT RUNNING");
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);
    const block = await ethers.provider.getBlockNumber();
    console.log("Block:", block);
}

main().catch(console.error);
